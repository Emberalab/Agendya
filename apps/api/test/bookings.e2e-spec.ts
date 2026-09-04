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

// Professionals default to America/Bogota (fixed UTC-5, no DST) unless changed.
function bogotaWeekdayForOffsetHours(
  offsetHours: number,
): (typeof WEEKDAY_NAMES)[number] {
  const bogotaNow = new Date(
    Date.now() + offsetHours * 60 * 60 * 1000 - 5 * 60 * 60 * 1000,
  );
  return WEEKDAY_NAMES[bogotaNow.getUTCDay()];
}

// `today`/`tomorrow` are opened fully in `setWorkingHours`, but each day is still an
// independent calendar day: a slot can't straddle midnight. `soonStartAt` offsets are all
// computed from this single shared anchor (rather than each calling `Date.now()`
// independently) so their relative spacing — and thus their non-overlap — is preserved
// even when the anchor itself needs to be moved away from the Bogota day boundary.
const MAX_SOON_OFFSET_MINUTES = 3 * 60 + 30; // largest hoursFromNow used below + service duration
const soonAnchor = (() => {
  const now = Date.now();
  const bogotaMinutesFromMidnight =
    ((now - 5 * 60 * 60 * 1000) / 60_000) % 1440;
  if (bogotaMinutesFromMidnight + MAX_SOON_OFFSET_MINUTES <= 1440) {
    return now;
  }
  // Not enough room before the Bogota day boundary — jump the anchor to 01:00 Bogota
  // the next day, which is always safely far from that boundary.
  const minutesUntilNext1am = 1440 - bogotaMinutesFromMidnight + 60;
  return now + minutesUntilNext1am * 60_000;
})();

function soonStartAt(hoursFromNow: number): string {
  return new Date(soonAnchor + hoursFromNow * 60 * 60 * 1000).toISOString();
}

describe('Bookings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `e2e-bookings-${runId}@agendya.test`;
  const otherEmail = `e2e-bookings-other-${runId}@agendya.test`;
  const password = 'supersecret123';

  let accessToken: string;
  let otherAccessToken: string;
  let slug: string;
  let serviceId: string;

  const farFutureDay = futureDate(10);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName: `E2E Bookings ${runId}` });
    const registerBody = register.body as {
      accessToken: string;
      user: { slug: string };
    };
    accessToken = registerBody.accessToken;
    slug = registerBody.user.slug;

    const registerOther = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        password,
        businessName: `E2E Bookings Otro ${runId}`,
      });
    otherAccessToken = (registerOther.body as { accessToken: string })
      .accessToken;

    const createService = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Corte de cabello',
        durationMinutes: 30,
        priceCents: 2000000,
      });
    serviceId = (createService.body as { id: string }).id;

    // Open the whole day for: today and tomorrow (policy tests) + a day 10 days out (far-future tests).
    await setWorkingHours();
  });

  /**
   * (Re-)applies the full set of working hours this suite relies on. `setWorkingHours` on the API
   * always REPLACES the whole week, so every test that needs an extra day open must go through this
   * helper (passing any `extraDays`) rather than calling PUT directly — otherwise it would wipe out
   * the days other tests in this file depend on.
   */
  async function setWorkingHours(
    extraDays: {
      dayOfWeek: string;
      startMinute: number;
      endMinute: number;
    }[] = [],
  ) {
    const todayWeekday = bogotaWeekdayForOffsetHours(0);
    const tomorrowWeekday = bogotaWeekdayForOffsetHours(24);
    const days = [
      { dayOfWeek: todayWeekday, startMinute: 0, endMinute: 1440 },
      { dayOfWeek: farFutureDay.weekday, startMinute: 480, endMinute: 1080 },
    ];
    if (tomorrowWeekday !== todayWeekday) {
      days.push({
        dayOfWeek: tomorrowWeekday,
        startMinute: 0,
        endMinute: 1440,
      });
    }
    for (const extra of extraDays) {
      if (!days.some((d) => d.dayOfWeek === extra.dayOfWeek)) {
        days.push(extra);
      }
    }

    await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ days })
      .expect(200);
  }

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { professional: { email: { in: [email, otherEmail] } } },
    });
    await prisma.professional.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await app.close();
  });

  it('rejects a booking that overlaps working hours or an exception day', async () => {
    // 1900 UTC is outside a day with no configured working hours for a distant, unconfigured weekday.
    const unconfiguredDay = futureDate(11);
    await request(app.getHttpServer())
      .post(`/public/professionals/${slug}/bookings`)
      .send({
        serviceIds: serviceId,
        startAt: `${unconfiguredDay.dateStr}T15:00:00.000Z`,
        customerName: 'Cliente Test',
        customerEmail: 'cliente@example.com',
        customerPhone: '+57 300 0000000',
      })
      .expect(409);
  });

  it('returns 404 when the slug does not exist', async () => {
    await request(app.getHttpServer())
      .post('/public/professionals/no-existe/bookings')
      .send({
        serviceIds: serviceId,
        startAt: `${farFutureDay.dateStr}T14:00:00.000Z`,
        customerName: 'Cliente Test',
        customerEmail: 'cliente@example.com',
        customerPhone: '+57 300 0000000',
      })
      .expect(404);
  });

  describe('creating and managing a booking', () => {
    let cancellationToken: string;
    const startAt = `${farFutureDay.dateStr}T14:00:00.000Z`;

    it('creates a booking for an available slot', async () => {
      const res = await request(app.getHttpServer())
        .post(`/public/professionals/${slug}/bookings`)
        .send({
          serviceIds: serviceId,
          startAt,
          customerName: 'Ana Cliente',
          customerEmail: 'ana.cliente@example.com',
          customerPhone: '+57 300 1112222',
        })
        .expect(201);

      const body = res.body as {
        businessName: string;
        serviceName: string;
        cancellationToken: string;
        canCancel: boolean;
        status: string;
      };
      expect(body.businessName).toBe(`E2E Bookings ${runId}`);
      expect(body.serviceName).toBe('Corte de cabello');
      expect(body.status).toBe('CONFIRMED');
      expect(body.canCancel).toBe(true);
      cancellationToken = body.cancellationToken;
    });

    it('rejects a second booking that overlaps the same slot', async () => {
      await request(app.getHttpServer())
        .post(`/public/professionals/${slug}/bookings`)
        .send({
          serviceIds: serviceId,
          startAt,
          customerName: 'Otro Cliente',
          customerEmail: 'otro@example.com',
          customerPhone: '+57 300 3334444',
        })
        .expect(409);
    });

    it('looks up the booking by its cancellation token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/public/bookings/${cancellationToken}`)
        .expect(200);

      expect((res.body as { customerName: string }).customerName).toBe(
        'Ana Cliente',
      );
    });

    it('returns 404 for an unknown cancellation token', async () => {
      await request(app.getHttpServer())
        .get('/public/bookings/no-existe-token')
        .expect(404);
    });

    it('cancels the booking within the cancellation policy window', async () => {
      const res = await request(app.getHttpServer())
        .post(`/public/bookings/${cancellationToken}/cancel`)
        .expect(201);

      expect((res.body as { status: string }).status).toBe('CANCELLED');
    });

    it('rejects cancelling an already-cancelled booking', async () => {
      await request(app.getHttpServer())
        .post(`/public/bookings/${cancellationToken}/cancel`)
        .expect(409);
    });
  });

  it('rejects cancelling a booking that is too close to its start time', async () => {
    const startAt = soonStartAt(2);

    const create = await request(app.getHttpServer())
      .post(`/public/professionals/${slug}/bookings`)
      .send({
        serviceIds: serviceId,
        startAt,
        customerName: 'Cliente Apurado',
        customerEmail: 'apurado@example.com',
        customerPhone: '+57 300 5556666',
      })
      .expect(201);

    const token = (create.body as { cancellationToken: string })
      .cancellationToken;

    await request(app.getHttpServer())
      .post(`/public/bookings/${token}/cancel`)
      .expect(403);
  });

  it('only one of two concurrent bookings for the same slot succeeds', async () => {
    const concurrencyDay = futureDate(12);
    const startAt = `${concurrencyDay.dateStr}T15:00:00.000Z`;
    await setWorkingHours([
      { dayOfWeek: concurrencyDay.weekday, startMinute: 0, endMinute: 1439 },
    ]);

    const makeRequest = (customerEmail: string) =>
      request(app.getHttpServer())
        .post(`/public/professionals/${slug}/bookings`)
        .send({
          serviceIds: serviceId,
          startAt,
          customerName: 'Cliente Concurrente',
          customerEmail,
          customerPhone: '+57 300 7778888',
        });

    const [first, second] = await Promise.all([
      makeRequest('concurrente-1@example.com'),
      makeRequest('concurrente-2@example.com'),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  describe('protected agenda', () => {
    it('lists bookings within the requested date range', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings')
        .query({ from: farFutureDay.dateStr, to: farFutureDay.dateStr })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as { customerName: string }[];
      expect(body.some((b) => b.customerName === 'Ana Cliente')).toBe(true);
    });

    it('rejects unauthenticated access', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .query({ from: farFutureDay.dateStr, to: farFutureDay.dateStr })
        .expect(401);
    });

    it('rejects a professional cancelling a booking inside the cancellation policy window', async () => {
      const startAt = soonStartAt(1);
      const create = await request(app.getHttpServer())
        .post(`/public/professionals/${slug}/bookings`)
        .send({
          serviceIds: serviceId,
          startAt,
          customerName: 'Cliente Del Profesional',
          customerEmail: 'delprofesional@example.com',
          customerPhone: '+57 300 9990000',
        })
        .expect(201);
      const bookingId = (create.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('lets the professional cancel a booking outside the cancellation policy window', async () => {
      const startAt = `${farFutureDay.dateStr}T16:00:00.000Z`;
      const create = await request(app.getHttpServer())
        .post(`/public/professionals/${slug}/bookings`)
        .send({
          serviceIds: serviceId,
          startAt,
          customerName: 'Cliente Lejano',
          customerEmail: 'clientelejano@example.com',
          customerPhone: '+57 300 9991111',
        })
        .expect(201);
      const bookingId = (create.body as { id: string }).id;

      const res = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((res.body as { status: string }).status).toBe('CANCELLED');
    });

    it("rejects cancelling another professional's booking", async () => {
      const startAt = soonStartAt(3);
      const create = await request(app.getHttpServer())
        .post(`/public/professionals/${slug}/bookings`)
        .send({
          serviceIds: serviceId,
          startAt,
          customerName: 'Cliente Ajeno',
          customerEmail: 'ajeno@example.com',
          customerPhone: '+57 300 1230000',
        })
        .expect(201);
      const bookingId = (create.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(404);
    });
  });

  describe('rescheduling and expiration', () => {
    // Seeded directly through Prisma rather than the public create endpoint:
    // that endpoint is throttled to 10 requests/minute per IP, a limit this
    // many setup bookings would blow through. Only the behavior actually
    // under test (reschedule/cancel/complete) goes through real HTTP calls.
    let professionalId: string;

    beforeAll(async () => {
      const professional = await prisma.professional.findUniqueOrThrow({
        where: { slug },
      });
      professionalId = professional.id;
    });

    async function seedBooking(
      startAt: Date,
      overrides: Record<string, unknown> = {},
    ) {
      return prisma.booking.create({
        data: {
          professionalId,
          serviceId,
          serviceNameSnapshot: 'Corte de cabello',
          durationMinutesSnapshot: 30,
          customerName: 'Cliente Reagenda',
          customerEmail: `reagenda-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
          customerPhone: '+57 300 1111000',
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60_000),
          ...overrides,
        },
      });
    }

    it('rejects rescheduling a booking that is too close to its start time', async () => {
      const booking = await seedBooking(new Date(Date.now() + 2 * 60 * 60_000));

      await request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/reschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newStartAt: `${farFutureDay.dateStr}T17:00:00.000Z` })
        .expect(403);
    });

    it('rejects rescheduling to a time in the past', async () => {
      const booking = await seedBooking(
        new Date(`${farFutureDay.dateStr}T17:00:00.000Z`),
      );

      await request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/reschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newStartAt: '2020-01-01T12:00:00.000Z' })
        .expect(400);
    });

    it('reschedules a booking outside the policy window and reports canReschedule/canCancel on the result', async () => {
      const booking = await seedBooking(
        new Date(`${farFutureDay.dateStr}T18:00:00.000Z`),
      );

      const res = await request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/reschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newStartAt: `${farFutureDay.dateStr}T19:00:00.000Z` })
        .expect(200);

      const body = res.body as { startAt: string; canReschedule: boolean };
      expect(body.startAt).toBe(`${farFutureDay.dateStr}T19:00:00.000Z`);
      expect(body.canReschedule).toBe(true);
    });

    it('reschedules a booking via its public cancellation token too', async () => {
      const booking = await seedBooking(
        new Date(`${farFutureDay.dateStr}T18:30:00.000Z`),
      );

      const res = await request(app.getHttpServer())
        .post(`/public/bookings/${booking.cancellationToken}/reschedule`)
        .send({ newStartAt: `${farFutureDay.dateStr}T19:30:00.000Z` })
        .expect(201);

      const body = res.body as {
        startAt: string;
        canCancel: boolean;
        canReschedule: boolean;
      };
      expect(body.startAt).toBe(`${farFutureDay.dateStr}T19:30:00.000Z`);
      expect(body.canCancel).toBe(true);
      expect(body.canReschedule).toBe(true);
    });

    it('self-heals a stale CONFIRMED booking to EXPIRED and rejects rescheduling it', async () => {
      // Simulates time having passed without the professional acting on it:
      // seeded already in the past, exactly what a stale, never-swept
      // booking looks like.
      const booking = await seedBooking(new Date(Date.now() - 60 * 60_000), {
        endAt: new Date(Date.now() - 30 * 60_000),
      });

      await request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/reschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newStartAt: `${farFutureDay.dateStr}T20:00:00.000Z` })
        .expect(403);

      const row = await prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
      });
      expect(row.status).toBe('EXPIRED');

      // An expired booking can still be marked complete after the fact...
      await request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // ...but once completed, it's no longer reschedulable either.
      await request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/reschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newStartAt: `${farFutureDay.dateStr}T20:00:00.000Z` })
        .expect(409);
    });

    it("rejects rescheduling another professional's booking", async () => {
      const booking = await seedBooking(
        new Date(`${farFutureDay.dateStr}T20:30:00.000Z`),
      );

      await request(app.getHttpServer())
        .patch(`/bookings/${booking.id}/reschedule`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ newStartAt: `${farFutureDay.dateStr}T21:00:00.000Z` })
        .expect(404);
    });

    it('only one of two concurrent reschedules onto the same new slot succeeds', async () => {
      const [first, second] = await Promise.all([
        seedBooking(new Date(`${farFutureDay.dateStr}T21:15:00.000Z`)),
        seedBooking(new Date(`${farFutureDay.dateStr}T21:45:00.000Z`)),
      ]);
      const targetStartAt = `${farFutureDay.dateStr}T13:30:00.000Z`;

      const [rescheduleFirst, rescheduleSecond] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/bookings/${first.id}/reschedule`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ newStartAt: targetStartAt }),
        request(app.getHttpServer())
          .patch(`/bookings/${second.id}/reschedule`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ newStartAt: targetStartAt }),
      ]);

      const statuses = [rescheduleFirst.status, rescheduleSecond.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });
});
