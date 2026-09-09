import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

const WEEKDAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

function futureDate(daysFromNow: number): {
  dateStr: string;
  weekday: (typeof WEEKDAY_NAMES)[number];
} {
  const target = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const dateStr = target.toISOString().slice(0, 10);
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekday =
    WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return { dateStr, weekday };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SseHandle {
  status: number;
  events: Array<Record<string, unknown>>;
  close: () => void;
}

/**
 * Opens the SSE stream with a raw HTTP request (supertest buffers the whole
 * response, which never ends for a stream) and parses `data:` frames as they
 * arrive. `token` omitted => no Authorization header.
 */
function openStream(port: number, token?: string): Promise<SseHandle> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/realtime/stream',
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        const events: Array<Record<string, unknown>> = [];
        let buffer = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          buffer += chunk;
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const data = frame
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('\n');
            if (!data) continue;
            try {
              events.push(JSON.parse(data) as Record<string, unknown>);
            } catch {
              // heartbeat / non-JSON frame — ignore
            }
          }
        });
        resolve({
          status: res.statusCode ?? 0,
          events,
          close: () => req.destroy(),
        });
      },
    );
    req.on('error', () => {
      /* destroyed on teardown */
    });
    req.end();
  });
}

const notificationEvents = (handle: SseHandle) =>
  handle.events.filter((e) => e.type === 'notification.created');

describe('Realtime SSE (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let port: number;

  const runId = Date.now();
  const email = `e2e-realtime-${runId}@agendya.test`;
  const otherEmail = `e2e-realtime-other-${runId}@agendya.test`;
  const password = 'supersecret123';

  let tokenA: string;
  let tokenB: string;
  let slugA: string;
  let serviceIdA: string;

  const day = futureDate(12);
  const openStreams: SseHandle[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);
    const server: http.Server = app.getHttpServer();
    port = (server.address() as AddressInfo).port;
    prisma = app.get(PrismaService);

    const registerA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName: `E2E Realtime ${runId}` });
    tokenA = (registerA.body as { accessToken: string }).accessToken;
    slugA = (registerA.body as { user: { slug: string } }).user.slug;

    const registerB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        password,
        businessName: `E2E Realtime Otro ${runId}`,
      });
    tokenB = (registerB.body as { accessToken: string }).accessToken;

    const service = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Corte de cabello',
        durationMinutes: 30,
        priceCents: 2000000,
      });
    serviceIdA = (service.body as { id: string }).id;

    await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        days: [{ dayOfWeek: day.weekday, startMinute: 480, endMinute: 1080 }],
      })
      .expect(200);
  });

  afterEach(() => {
    openStreams.splice(0).forEach((s) => s.close());
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { professional: { email: { in: [email, otherEmail] } } },
    });
    await prisma.professional.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await app.close();
  });

  function track(handle: SseHandle): SseHandle {
    openStreams.push(handle);
    return handle;
  }

  it('rejects an unauthenticated connection with 401', async () => {
    const stream = track(await openStream(port));
    expect(stream.status).toBe(401);
  });

  it('rejects a connection with a bogus token with 401', async () => {
    const stream = track(await openStream(port, 'not-a-real-jwt'));
    expect(stream.status).toBe(401);
  });

  it('delivers notification.created only to the professional who owns the booking', async () => {
    const streamA = track(await openStream(port, tokenA));
    const streamB = track(await openStream(port, tokenB));
    expect(streamA.status).toBe(200);
    expect(streamB.status).toBe(200);

    // Give the subscriptions a beat to register before the booking fires.
    await delay(100);

    const booking = await request(app.getHttpServer())
      .post(`/public/professionals/${slugA}/bookings`)
      .send({
        serviceIds: serviceIdA,
        startAt: `${day.dateStr}T15:00:00.000Z`,
        customerName: 'Ana Cliente',
        customerEmail: 'ana.cliente@example.com',
        customerPhone: '+57 300 1234567',
      })
      .expect(201);
    const bookingId = (booking.body as { id: string }).id;

    await delay(300);

    const received = notificationEvents(streamA);
    expect(received).toHaveLength(1);

    const event = received[0] as {
      type: string;
      notification: Record<string, unknown> & {
        data: Record<string, unknown>;
      };
    };
    expect(event.type).toBe('notification.created');
    expect(event.notification.type).toBe('APPOINTMENT_CREATED');
    expect(event.notification.title).toBe('Nueva cita');
    expect(typeof event.notification.id).toBe('string');
    expect(event.notification.readAt).toBeNull();
    expect(event.notification.data).toEqual({
      bookingId,
      customerName: 'Ana Cliente',
      serviceName: 'Corte de cabello',
      startAt: `${day.dateStr}T15:00:00.000Z`,
    });
    // No contact details or token leak through the socket.
    expect(event.notification.data).not.toHaveProperty('customerEmail');
    expect(event.notification.data).not.toHaveProperty('customerPhone');
    expect(event.notification).not.toHaveProperty('professionalId');

    // The other professional's stream stays silent.
    expect(notificationEvents(streamB)).toHaveLength(0);
  });
});
