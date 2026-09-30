import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AgendaBooking, PublicBooking, Service } from '@agendya/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

const WEEKDAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/** `daysFromNow` at 15:00 UTC (10:00 in the default America/Bogota). */
function slotInDays(daysFromNow: number): string {
  const day = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return `${day.toISOString().slice(0, 10)}T15:00:00.000Z`;
}

/**
 * End-to-end proof that real dashboard/public actions leave the product
 * activity trail the Backoffice panel reads — and that it carries no
 * customer contact data.
 */
describe('Professional activity recording (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `activity-e2e-${runId}@agendya.test`;
  const password = 'supersecret123';
  const customer = {
    customerName: 'Cliente Privado',
    customerEmail: `cliente-${runId}@example.com`,
    customerPhone: '+57 311 5550000',
  };
  let token: string;
  let professionalId: string;
  let slug: string;

  const server = () => app.getHttpServer();
  const asPro = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);
  const events = () =>
    prisma.professionalActivityEvent.findMany({
      where: { professionalId },
      orderBy: { occurredAt: 'asc' },
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const res = await request(server())
      .post('/auth/register')
      .send({
        email,
        password,
        businessName: `Activity Barber ${runId}`,
        acceptTerms: true,
      })
      .expect(201);
    const body = res.body as {
      accessToken: string;
      user: { id: string; slug: string };
    };
    token = body.accessToken;
    professionalId = body.user.id;
    slug = body.user.slug;
  });

  afterAll(async () => {
    await prisma.professional.deleteMany({ where: { email } });
    await prisma.platformAccessEmail.deleteMany({ where: { email } });
    await app.close();
  });

  it('records the account creation and a login', async () => {
    await request(server())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const types = (await events()).map((event) => event.type);
    expect(types).toEqual(['ACCOUNT_CREATED', 'LOGGED_IN']);
  });

  it('records at most one dashboard visit per day', async () => {
    await asPro(request(server()).get('/professionals/me')).expect(200);
    await asPro(request(server()).get('/professionals/me')).expect(200);

    const visits = (await events()).filter(
      (event) => event.type === 'DASHBOARD_VISITED',
    );
    expect(visits).toHaveLength(1);
  });

  it('records the setup and appointment lifecycle, without customer data', async () => {
    await asPro(request(server()).patch('/professionals/me'))
      .send({ category: 'Barbería' })
      .expect(200);

    const service = (
      await asPro(request(server()).post('/services'))
        .send({
          name: 'Corte clásico',
          durationMinutes: 30,
          priceCents: 2000000,
        })
        .expect(201)
    ).body as Service;
    await asPro(request(server()).patch(`/services/${service.id}`))
      .send({ priceCents: 2500000 })
      .expect(200);

    await asPro(request(server()).put('/schedules/working-hours'))
      .send({
        days: WEEKDAYS.map((dayOfWeek) => ({
          dayOfWeek,
          startMinute: 0,
          endMinute: 1440,
        })),
      })
      .expect(200);

    const blocked = (
      await asPro(request(server()).post('/schedules/exceptions'))
        .send({ date: slotInDays(20).slice(0, 10), reason: 'Vacaciones' })
        .expect(201)
    ).body as { id: string };
    await asPro(
      request(server()).delete(`/schedules/exceptions/${blocked.id}`),
    ).expect(200);

    // Customer books online, professional reschedules, customer cancels.
    const online = (
      await request(server())
        .post(`/public/professionals/${slug}/bookings`)
        .send({ serviceIds: service.id, startAt: slotInDays(10), ...customer })
        .expect(201)
    ).body as PublicBooking;
    await asPro(request(server()).patch(`/bookings/${online.id}/reschedule`))
      .send({ newStartAt: slotInDays(11) })
      .expect(200);
    await request(server())
      .post(`/public/bookings/${online.cancellationToken}/cancel`)
      .expect(201);

    // Professional books manually and completes it.
    const manual = (
      await asPro(request(server()).post('/bookings'))
        .send({ serviceIds: service.id, startAt: slotInDays(12), ...customer })
        .expect(201)
    ).body as AgendaBooking;
    await asPro(
      request(server()).patch(`/bookings/${manual.id}/complete`),
    ).expect(200);

    const recorded = await events();
    const trail = recorded.map((event) => `${event.type}:${event.actor}`);
    expect(trail).toEqual(
      expect.arrayContaining([
        'PROFILE_UPDATED:PROFESSIONAL',
        'SERVICE_CREATED:PROFESSIONAL',
        'SERVICE_UPDATED:PROFESSIONAL',
        'WORKING_HOURS_UPDATED:PROFESSIONAL',
        'SCHEDULE_EXCEPTION_CREATED:PROFESSIONAL',
        'SCHEDULE_EXCEPTION_DELETED:PROFESSIONAL',
        'BOOKING_CREATED:CUSTOMER',
        'BOOKING_RESCHEDULED:PROFESSIONAL',
        'BOOKING_CANCELLED:CUSTOMER',
        'BOOKING_CREATED:PROFESSIONAL',
        'BOOKING_COMPLETED:PROFESSIONAL',
      ]),
    );
    expect(recorded.every((event) => event.category)).toBe(true);
    expect(recorded.some((event) => event.backfilled)).toBe(false);

    const reschedule = recorded.find(
      (event) => event.type === 'BOOKING_RESCHEDULED',
    );
    expect(reschedule?.entityId).toBe(online.id);
    expect(reschedule?.metadata).toMatchObject({
      from: slotInDays(10),
      to: slotInDays(11),
    });

    const serialized = JSON.stringify(recorded);
    expect(serialized).not.toContain(customer.customerName);
    expect(serialized).not.toContain(customer.customerEmail);
    expect(serialized).not.toContain(customer.customerPhone);
    expect(serialized).not.toContain(password);
  });

  it('records nothing for a rejected action', async () => {
    const before = (await events()).length;
    await asPro(
      request(server()).patch(
        '/bookings/00000000-0000-4000-8000-000000000000/cancel',
      ),
    ).expect(404);
    expect(await events()).toHaveLength(before);
  });
});
