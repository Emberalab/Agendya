import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import type {
  ActivityListResponse,
  ActivitySummary,
  BackofficeAuthResponse,
  TrialListResponse,
} from '@agendya/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

const DAY = 24 * 60 * 60 * 1000;
const HISTORY_SIZE = 250;

describe('Professional activity panel (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const now = Date.now();
  const at = (daysAgo: number, hour = 15) =>
    new Date(
      Date.UTC(
        new Date(now - daysAgo * DAY).getUTCFullYear(),
        new Date(now - daysAgo * DAY).getUTCMonth(),
        new Date(now - daysAgo * DAY).getUTCDate(),
        hour,
      ),
    );
  const password = 'supersecret123';

  let readOnlyToken: string;
  let readOnlyUserId: string;
  let trialProId: string;
  let otherProId: string;
  let emptyProId: string;
  let otherProEventId: string;
  let rescheduledBookingId: string;

  const server = () => app.getHttpServer();
  const get = (path: string, token = readOnlyToken) =>
    request(server()).get(path).set('Authorization', `Bearer ${token}`);
  const activityPath = (id: string, query = '') =>
    `/backoffice/professionals/${id}/activity${query}`;
  const listAll = async (id: string, query: string) => {
    const items: ActivityListResponse['items'] = [];
    let cursor: string | null = null;
    do {
      const res = await get(
        activityPath(
          id,
          `?${query}&limit=100${cursor ? `&cursor=${cursor}` : ''}`,
        ),
      ).expect(200);
      const page = res.body as ActivityListResponse;
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  };

  const event = (
    professionalId: string,
    type: Prisma.ProfessionalActivityEventCreateManyInput['type'],
    occurredAt: Date,
    extra: Partial<Prisma.ProfessionalActivityEventCreateManyInput> = {},
  ): Prisma.ProfessionalActivityEventCreateManyInput => ({
    professionalId,
    type,
    category: type.startsWith('BOOKING')
      ? 'APPOINTMENT'
      : type.startsWith('SERVICE')
        ? 'SERVICE'
        : type === 'WORKING_HOURS_UPDATED'
          ? 'SCHEDULE'
          : 'ACCOUNT',
    actor: 'PROFESSIONAL',
    occurredAt,
    ...extra,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const readOnly = await prisma.internalUser.create({
      data: {
        email: `activity-readonly-e2e-${runId}@agendya.test`,
        name: 'Read Only Activity',
        passwordHash: bcrypt.hashSync(password, 10),
        role: 'READ_ONLY',
      },
    });
    readOnlyUserId = readOnly.id;
    const login = await request(server())
      .post('/backoffice/auth/login')
      .send({ email: readOnly.email, password })
      .expect(200);
    readOnlyToken = (login.body as BackofficeAuthResponse).accessToken;

    const makePro = (
      name: string,
      data: Partial<Prisma.ProfessionalCreateInput> = {},
    ) =>
      prisma.professional.create({
        data: {
          email: `activity-${name}-e2e-${runId}@agendya.test`,
          businessName: `Activity ${name} ${runId}`,
          slug: `activity-${name}-e2e-${runId}`,
          ...data,
        },
      });

    // Trial started 10 days ago, 20 days left.
    const trialPro = await makePro('trial', {
      createdAt: at(15),
      category: 'Barbería',
      logoUrl: 'https://example.com/logo.png',
      trialStartedAt: new Date(now - 10 * DAY),
      trialEndsAt: new Date(now + 20 * DAY),
    });
    trialProId = trialPro.id;
    otherProId = (await makePro('other')).id;
    emptyProId = (await makePro('empty')).id;

    await prisma.service.createMany({
      data: [
        {
          professionalId: trialProId,
          name: 'Corte clásico',
          durationMinutes: 30,
        },
        { professionalId: trialProId, name: 'Barba', durationMinutes: 20 },
        {
          professionalId: trialProId,
          name: 'Tinte',
          durationMinutes: 60,
          deletedAt: new Date(now - 2 * DAY),
          isActive: false,
        },
      ],
    });
    await prisma.workingHour.createMany({
      data: [
        {
          professionalId: trialProId,
          dayOfWeek: 'MONDAY',
          startMinute: 480,
          endMinute: 720,
        },
        {
          professionalId: trialProId,
          dayOfWeek: 'MONDAY',
          startMinute: 840,
          endMinute: 1080,
        },
        {
          professionalId: trialProId,
          dayOfWeek: 'TUESDAY',
          startMinute: 480,
          endMinute: 1080,
        },
      ],
    });

    const booking = (
      daysAgo: number,
      status: Prisma.BookingCreateManyInput['status'],
      phone: string,
      extra: Partial<Prisma.BookingCreateManyInput> = {},
    ): Prisma.BookingCreateManyInput => ({
      professionalId: trialProId,
      serviceNameSnapshot: 'Corte clásico',
      durationMinutesSnapshot: 30,
      customerName: 'Cliente',
      customerPhone: phone,
      startAt: new Date(now + DAY),
      endAt: new Date(now + DAY + 30 * 60_000),
      createdAt: at(daysAgo),
      status,
      ...extra,
    });
    await prisma.booking.createMany({
      data: [
        booking(9, 'COMPLETED', '+57 300 0000001'),
        booking(8, 'COMPLETED', '+57 300 0000001'),
        booking(7, 'CANCELLED', '+57 300 0000002', {
          cancelledBy: 'customer',
          cancelledAt: at(6),
        }),
        booking(6, 'CANCELLED', '+57 300 0000003', {
          cancelledBy: 'professional',
          cancelledAt: at(5),
        }),
        booking(5, 'CONFIRMED', '+57 300 0000004', { source: 'MANUAL' }),
        booking(4, 'PENDING', '+57 300 0000005'),
        // Before the trial: must not count.
        booking(12, 'COMPLETED', '+57 300 0000009'),
      ],
    });
    const rescheduled = await prisma.booking.findFirstOrThrow({
      where: { professionalId: trialProId, status: 'CONFIRMED' },
    });
    rescheduledBookingId = rescheduled.id;
    const other = await prisma.booking.findFirstOrThrow({
      where: { professionalId: trialProId, status: 'PENDING' },
    });

    await prisma.professionalActivityEvent.createMany({
      data: [
        event(trialProId, 'ACCOUNT_CREATED', at(15)),
        event(trialProId, 'SERVICE_CREATED', at(9, 13), {
          subject: 'Corte clásico',
          entityType: 'Service',
        }),
        event(trialProId, 'WORKING_HOURS_UPDATED', at(9, 14)),
        event(trialProId, 'SERVICE_UPDATED', at(6), { subject: 'Barba' }),
        event(trialProId, 'BOOKING_RESCHEDULED', at(3), {
          entityType: 'Booking',
          entityId: rescheduledBookingId,
          subject: 'Corte clásico',
        }),
        event(trialProId, 'BOOKING_RESCHEDULED', at(2), {
          entityType: 'Booking',
          entityId: rescheduledBookingId,
          actor: 'CUSTOMER',
          subject: 'Corte clásico',
        }),
        event(trialProId, 'BOOKING_RESCHEDULED', at(2, 16), {
          entityType: 'Booking',
          entityId: other.id,
          actor: 'CUSTOMER',
          subject: 'Corte clásico',
        }),
        // Before the trial window.
        event(trialProId, 'BOOKING_RESCHEDULED', at(12), {
          entityType: 'Booking',
          entityId: rescheduledBookingId,
        }),
      ],
    });
    // A long history of visits, one per 5 minutes going back from 11 days
    // ago (before the trial) — exercises pagination.
    await prisma.professionalActivityEvent.createMany({
      data: Array.from({ length: HISTORY_SIZE }, (_, i) =>
        event(
          trialProId,
          'LOGGED_IN',
          new Date(at(11).getTime() - i * 5 * 60_000),
        ),
      ),
    });

    const otherEvent = await prisma.professionalActivityEvent.create({
      data: event(otherProId, 'SERVICE_CREATED', at(1), {
        subject: 'Corte clásico',
      }),
    });
    otherProEventId = otherEvent.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { actorInternalUserId: readOnlyUserId },
    });
    await prisma.professional.deleteMany({
      where: { id: { in: [trialProId, otherProId, emptyProId] } },
    });
    await prisma.internalUser.deleteMany({ where: { id: readOnlyUserId } });
    await app.close();
  });

  describe('authorization', () => {
    it('rejects requests without a token', async () => {
      await request(server()).get(activityPath(trialProId)).expect(401);
      await request(server())
        .get(activityPath(trialProId, '/summary'))
        .expect(401);
      await request(server()).get('/backoffice/trials').expect(401);
    });

    it('rejects a token without the Backoffice audience (a professional-family token)', async () => {
      const foreign = app
        .get(JwtService)
        .sign({ sub: trialProId, email: 'pro@agendya.test' });
      await get(activityPath(trialProId), foreign).expect(401);
      await get(activityPath(trialProId, '/summary'), foreign).expect(401);
    });

    it('lets the lowest internal role (READ_ONLY) read it', async () => {
      await get(activityPath(trialProId)).expect(200);
    });

    it('validates the professional id', async () => {
      await get(activityPath('not-a-uuid')).expect(400);
      await get(activityPath('00000000-0000-4000-8000-000000000000')).expect(
        404,
      );
    });
  });

  describe('timeline', () => {
    it('lists newest first and pages through a large history without gaps', async () => {
      const items = await listAll(trialProId, 'order=desc');
      expect(items).toHaveLength(HISTORY_SIZE + 8);
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
      const times = items.map((item) => item.occurredAt);
      expect([...times].sort().reverse()).toEqual(times);
    });

    it('never returns another professional’s events, even with their cursor', async () => {
      const items = await listAll(trialProId, 'order=desc');
      expect(items.some((item) => item.id === otherProEventId)).toBe(false);

      const res = await get(
        activityPath(trialProId, `?cursor=${otherProEventId}&limit=100`),
      ).expect(200);
      const ids = (res.body as ActivityListResponse).items.map((i) => i.id);
      const own = await prisma.professionalActivityEvent.findMany({
        where: { id: { in: ids } },
        select: { professionalId: true },
      });
      expect(own.every((row) => row.professionalId === trialProId)).toBe(true);
    });

    it('filters to the trial period', async () => {
      const items = await listAll(trialProId, 'trialOnly=true');
      expect(items.map((item) => item.type).sort()).toEqual(
        [
          'BOOKING_RESCHEDULED',
          'BOOKING_RESCHEDULED',
          'BOOKING_RESCHEDULED',
          'SERVICE_CREATED',
          'SERVICE_UPDATED',
          'WORKING_HOURS_UPDATED',
        ].sort(),
      );
    });

    it('filters by date range', async () => {
      const from = at(4).toISOString();
      const to = at(2, 23).toISOString();
      const items = await listAll(trialProId, `from=${from}&to=${to}`);
      expect(items).toHaveLength(3);
    });

    it('filters by category, type, actor, appointment and search', async () => {
      const appointments = await listAll(trialProId, 'category=APPOINTMENT');
      expect(appointments).toHaveLength(4);

      const byCustomer = await listAll(
        trialProId,
        'type=BOOKING_RESCHEDULED&actor=CUSTOMER',
      );
      expect(byCustomer).toHaveLength(2);

      const oneBooking = await listAll(
        trialProId,
        `entityId=${rescheduledBookingId}&trialOnly=true`,
      );
      expect(oneBooking).toHaveLength(2);

      const search = await listAll(trialProId, 'search=barba');
      expect(search.map((item) => item.type)).toEqual(['SERVICE_UPDATED']);
    });

    it('supports oldest-first ordering', async () => {
      const res = await get(
        activityPath(trialProId, '?order=asc&limit=1'),
      ).expect(200);
      expect((res.body as ActivityListResponse).items[0].type).toBe(
        'ACCOUNT_CREATED',
      );
    });

    it('returns an empty state for an account with no activity', async () => {
      const res = await get(activityPath(emptyProId)).expect(200);
      expect(res.body).toEqual({ items: [], nextCursor: null });
      const trialOnly = await get(
        activityPath(emptyProId, '?trialOnly=true'),
      ).expect(200);
      expect((trialOnly.body as ActivityListResponse).items).toEqual([]);
    });
  });

  describe('summary', () => {
    let summary: ActivitySummary;

    beforeAll(async () => {
      const res = await get(activityPath(trialProId, '/summary')).expect(200);
      summary = res.body as ActivitySummary;
    });

    it('reports the trial and uses it as the metrics window', () => {
      expect(summary.trial.status).toBe('ACTIVE');
      expect(summary.trial.daysRemaining).toBe(20);
      expect(summary.window.basis).toBe('TRIAL');
      expect(summary.professional.effectivePlan).toBe('BUSINESS');
    });

    it('derives appointment metrics from bookings created in the trial', () => {
      expect(summary.appointments).toEqual({
        total: 6,
        online: 5,
        manual: 1,
        pending: 1,
        confirmed: 1,
        completed: 2,
        cancelled: 2,
        cancelledByCustomer: 1,
        cancelledByProfessional: 1,
        noShow: 0,
        expired: 0,
        rescheduled: 2,
        rescheduleEvents: 3,
      });
      expect(summary.customers).toEqual({ distinct: 5, returning: 1 });
    });

    it('reports configuration from current data', () => {
      expect(summary.configuration.services).toEqual({
        total: 2,
        active: 2,
        planLocked: 0,
      });
      expect(summary.configuration.schedule).toMatchObject({
        workingDays: 2,
        timeBlocks: 3,
      });
      expect(summary.configuration.profile).toEqual({
        hasCategory: true,
        hasDescription: false,
        hasLogoOrPhoto: true,
        hasCoverImage: false,
      });
    });

    it('reports usage and engagement inside the window', () => {
      expect(summary.usage).toMatchObject({
        servicesCreated: 1,
        servicesUpdated: 1,
        scheduleChanges: 1,
      });
      // Own (PROFESSIONAL) activity in the trial falls on three distinct
      // days: 9, 6 and 3 days ago. Customer reschedules don't count.
      expect(summary.engagement.activeDays).toBe(3);
      expect(
        summary.daily.reduce((sum, day) => sum + day.bookingsCreated, 0),
      ).toBe(6);
      expect(summary.milestones.firstScheduleAt).not.toBeNull();
    });

    it('audit-logs the view', async () => {
      const rows = await prisma.auditLog.findMany({
        where: {
          actorInternalUserId: readOnlyUserId,
          action: 'SUPPORT_VIEWED_PROFESSIONAL_ACTIVITY',
          entityId: trialProId,
        },
      });
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('falls back to recent activity for an account without a trial', async () => {
      const res = await get(activityPath(emptyProId, '/summary')).expect(200);
      const empty = res.body as ActivitySummary;
      expect(empty.trial.status).toBe('NONE');
      expect(empty.window.basis).toBe('RECENT');
      expect(empty.appointments.total).toBe(0);
      expect(empty.engagement.lastActivityAt).toBeNull();
      expect(empty.daily.every((day) => day.professionalEvents === 0)).toBe(
        true,
      );
    });
  });

  describe('trial accounts list', () => {
    it('lists trial accounts with their bookings in trial', async () => {
      const res = await get(
        '/backoffice/trials?status=ACTIVE&limit=100',
      ).expect(200);
      const items = (res.body as TrialListResponse).items;
      const trial = items.find((item) => item.id === trialProId);
      expect(trial).toMatchObject({
        status: 'ACTIVE',
        bookingsInTrial: 6,
        daysRemaining: 20,
      });
      expect(trial?.lastActivityAt).not.toBeNull();
      expect(items.some((item) => item.id === emptyProId)).toBe(false);
    });

    it('excludes running trials from the ENDED filter', async () => {
      const res = await get('/backoffice/trials?status=ENDED&limit=100').expect(
        200,
      );
      const items = (res.body as TrialListResponse).items;
      expect(items.some((item) => item.id === trialProId)).toBe(false);
    });
  });
});
