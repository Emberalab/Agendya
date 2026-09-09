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

interface NotificationBody {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { bookingId: string; customerName: string; serviceName: string };
  readAt: string | null;
  createdAt: string;
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `e2e-notif-${runId}@agendya.test`;
  const otherEmail = `e2e-notif-other-${runId}@agendya.test`;
  const password = 'supersecret123';

  let tokenA: string;
  let tokenB: string;
  let slugA: string;
  let serviceIdA: string;

  const day = futureDate(14);
  const authA = () => ({ Authorization: `Bearer ${tokenA}` });
  const authB = () => ({ Authorization: `Bearer ${tokenB}` });

  async function book(hhmm: string, customerName: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/public/professionals/${slugA}/bookings`)
      .send({
        serviceIds: serviceIdA,
        startAt: `${day.dateStr}T${hhmm}:00.000Z`,
        customerName,
        customerEmail: 'cliente@example.com',
        customerPhone: '+57 300 1234567',
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const regA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName: `E2E Notif ${runId}` });
    tokenA = (regA.body as { accessToken: string }).accessToken;
    slugA = (regA.body as { user: { slug: string } }).user.slug;

    const regB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        password,
        businessName: `E2E Notif Otro ${runId}`,
      });
    tokenB = (regB.body as { accessToken: string }).accessToken;

    const svc = await request(app.getHttpServer())
      .post('/services')
      .set(authA())
      .send({
        name: 'Corte de cabello',
        durationMinutes: 30,
        priceCents: 2000000,
      });
    serviceIdA = (svc.body as { id: string }).id;

    await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set(authA())
      .send({
        days: [{ dayOfWeek: day.weekday, startMinute: 480, endMinute: 1080 }],
      })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { professional: { email: { in: [email, otherEmail] } } },
    });
    await prisma.booking.deleteMany({
      where: { professional: { email: { in: [email, otherEmail] } } },
    });
    await prisma.professional.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await app.close();
  });

  it('rejects unauthenticated access to every notification endpoint', async () => {
    const server = app.getHttpServer();
    await request(server).get('/notifications').expect(401);
    await request(server).get('/notifications/unread-count').expect(401);
    await request(server).patch('/notifications/some-id/read').expect(401);
    await request(server).patch('/notifications/read-all').expect(401);
  });

  it('records an APPOINTMENT_CREATED notification for the booking owner only', async () => {
    const bookingId = await book('15:00', 'Ana Uno');

    const listA = await request(app.getHttpServer())
      .get('/notifications')
      .set(authA())
      .expect(200);
    const items = (listA.body as { items: NotificationBody[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'APPOINTMENT_CREATED',
      title: 'Nueva cita',
      readAt: null,
    });
    expect(items[0].data.bookingId).toBe(bookingId);
    expect(items[0].data.customerName).toBe('Ana Uno');
    expect(items[0].body).toContain('Ana Uno');
    // no contact details leak into the feed row
    expect(JSON.stringify(items[0].data)).not.toContain('cliente@example.com');
    expect(JSON.stringify(items[0].data)).not.toContain('+57 300 1234567');

    const listB = await request(app.getHttpServer())
      .get('/notifications')
      .set(authB())
      .expect(200);
    expect((listB.body as { items: NotificationBody[] }).items).toHaveLength(0);
  });

  it('reports the unread count per professional', async () => {
    const a = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((a.body as { count: number }).count).toBe(1);

    const b = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authB())
      .expect(200);
    expect((b.body as { count: number }).count).toBe(0);
  });

  it("does not let a professional mark another professional's notification read", async () => {
    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set(authA())
      .expect(200);
    const notifId = (list.body as { items: NotificationBody[] }).items[0].id;

    await request(app.getHttpServer())
      .patch(`/notifications/${notifId}/read`)
      .set(authB())
      .expect(404);

    const stillUnread = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((stillUnread.body as { count: number }).count).toBe(1);
  });

  it('marks a single notification read for its owner', async () => {
    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set(authA())
      .expect(200);
    const notifId = (list.body as { items: NotificationBody[] }).items[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/notifications/${notifId}/read`)
      .set(authA())
      .expect(200);
    expect((res.body as NotificationBody).readAt).not.toBeNull();

    const count = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((count.body as { count: number }).count).toBe(0);
  });

  it('paginates with an opaque cursor', async () => {
    await book('15:30', 'Ana Dos');
    await book('16:00', 'Ana Tres');

    const page1 = await request(app.getHttpServer())
      .get('/notifications?limit=2')
      .set(authA())
      .expect(200);
    const body1 = page1.body as {
      items: NotificationBody[];
      nextCursor: string | null;
    };
    expect(body1.items).toHaveLength(2);
    expect(body1.nextCursor).toBeTruthy();

    const page2 = await request(app.getHttpServer())
      .get(
        `/notifications?limit=2&cursor=${encodeURIComponent(body1.nextCursor!)}`,
      )
      .set(authA())
      .expect(200);
    const body2 = page2.body as {
      items: NotificationBody[];
      nextCursor: string | null;
    };
    expect(body2.items.length).toBeGreaterThanOrEqual(1);

    const page1Ids = new Set(body1.items.map((n) => n.id));
    for (const item of body2.items) {
      expect(page1Ids.has(item.id)).toBe(false);
    }
  });

  it('marks all notifications read', async () => {
    const before = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((before.body as { count: number }).count).toBeGreaterThan(0);

    const res = await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .set(authA())
      .expect(200);
    expect((res.body as { updated: number }).updated).toBeGreaterThan(0);

    const after = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((after.body as { count: number }).count).toBe(0);
  });
});
