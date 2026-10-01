import { expect, test, type Page } from '@playwright/test';
import type {
  ActivityEvent,
  ActivityListResponse,
  ActivitySummary,
  BackofficeAuthResponse,
  BackofficeDashboard,
  InternalUser,
  TrialListResponse,
} from '@agendya/types';

/**
 * Backoffice → Pruebas → a trial professional → Actividad: inspect the
 * summary, the timeline, filter it, and read the appointment metrics.
 * Stubs `/backoffice/*` at the network boundary like
 * login-and-tickets.spec.ts, and asserts the filters reach the API as
 * query parameters (the server does the filtering and pagination).
 */
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4001';
const PRO_ID = '3f1c2b1a-6d7e-4f00-9a1b-2c3d4e5f6a7b';
const BOOKING_ID = '7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d';

const readOnlyUser: InternalUser = {
  id: 'internal-ro',
  email: 'readonly@agendya.test',
  name: 'Read Only',
  role: 'READ_ONLY',
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const dashboard: BackofficeDashboard = {
  openTickets: 0,
  urgentTickets: 0,
  waitingForCustomerTickets: 0,
  unassignedTickets: 0,
  recentTickets: [],
};

const trials: TrialListResponse = {
  items: [
    {
      id: PRO_ID,
      email: 'juan@barberia.test',
      businessName: 'Barbería Juan Pérez',
      slug: 'barberia-juan',
      status: 'ACTIVE',
      startedAt: '2026-09-15T15:00:00.000Z',
      endsAt: '2026-10-15T15:00:00.000Z',
      daysRemaining: 15,
      lastActivityAt: new Date().toISOString(),
      bookingsInTrial: 48,
    },
  ],
  nextCursor: null,
};

const summary: ActivitySummary = {
  professional: {
    id: PRO_ID,
    email: 'juan@barberia.test',
    businessName: 'Barbería Juan Pérez',
    slug: 'barberia-juan',
    timezone: 'America/Bogota',
    createdAt: '2026-09-15T14:00:00.000Z',
    plan: 'FREE',
    effectivePlan: 'BUSINESS',
  },
  trial: {
    status: 'ACTIVE',
    startedAt: '2026-09-15T15:00:00.000Z',
    endsAt: '2026-10-15T15:00:00.000Z',
    daysRemaining: 15,
    history: [
      {
        id: 'b5a1f0e2-1111-4c2d-9e3f-000000000001',
        action: 'GRANTED',
        actorEmail: 'admin@agendya.test',
        previousEndsAt: null,
        endsAt: '2026-10-15T15:00:00.000Z',
        note: null,
        createdAt: '2026-09-15T15:00:00.000Z',
      },
    ],
  },
  window: {
    basis: 'TRIAL',
    from: '2026-09-15T15:00:00.000Z',
    to: '2026-09-30T15:00:00.000Z',
  },
  appointments: {
    total: 48,
    online: 40,
    manual: 8,
    pending: 5,
    confirmed: 5,
    completed: 31,
    cancelled: 7,
    cancelledByCustomer: 5,
    cancelledByProfessional: 2,
    noShow: 0,
    expired: 0,
    rescheduled: 10,
    rescheduleEvents: 12,
  },
  customers: { distinct: 37, returning: 9 },
  configuration: {
    profile: {
      hasCategory: true,
      hasDescription: true,
      hasLogoOrPhoto: true,
      hasCoverImage: false,
    },
    services: { total: 5, active: 5, planLocked: 0 },
    schedule: {
      workingDays: 5,
      timeBlocks: 5,
      days: [{ dayOfWeek: 'MONDAY', blocks: [[480, 1080]] }],
      upcomingBlockedDates: 1,
    },
    pushDevices: 1,
  },
  usage: {
    servicesCreated: 5,
    servicesUpdated: 2,
    servicesDeleted: 0,
    scheduleChanges: 1,
    blockedDatesCreated: 1,
    profileUpdates: 3,
    notificationsReceived: 40,
    notificationsRead: 35,
    supportTicketsOpened: 0,
  },
  engagement: {
    firstActivityAt: '2026-09-15T14:00:00.000Z',
    lastActivityAt: '2026-09-30T14:00:00.000Z',
    activeDays: 12,
    windowDays: 16,
    daysSinceLastActivity: 0,
    lastBookingCreatedAt: '2026-09-30T13:00:00.000Z',
  },
  milestones: {
    accountCreatedAt: '2026-09-15T14:00:00.000Z',
    firstServiceAt: '2026-09-15T14:30:00.000Z',
    firstScheduleAt: '2026-09-16T15:00:00.000Z',
    firstBookingAt: '2026-09-17T15:00:00.000Z',
    firstManualBookingAt: null,
  },
  daily: [
    { date: '2026-09-15', professionalEvents: 4, bookingsCreated: 0 },
    { date: '2026-09-16', professionalEvents: 1, bookingsCreated: 1 },
  ],
  trackedSince: '2026-09-15T14:00:00.000Z',
};

const event = (overrides: Partial<ActivityEvent>): ActivityEvent => ({
  id: crypto.randomUUID(),
  type: 'ACCOUNT_CREATED',
  category: 'ACCOUNT',
  actor: 'PROFESSIONAL',
  entityType: null,
  entityId: null,
  subject: null,
  metadata: null,
  backfilled: false,
  occurredAt: '2026-09-15T14:00:00.000Z',
  ...overrides,
});

const serviceCreated = event({
  type: 'SERVICE_CREATED',
  category: 'SERVICE',
  subject: 'Corte clásico',
  metadata: { name: 'Corte clásico', durationMinutes: 30, priceCents: 2000000 },
  occurredAt: '2026-09-15T14:30:00.000Z',
});
const rescheduled = event({
  type: 'BOOKING_RESCHEDULED',
  category: 'APPOINTMENT',
  actor: 'CUSTOMER',
  entityType: 'Booking',
  entityId: BOOKING_ID,
  subject: 'Corte clásico',
  metadata: {
    from: '2026-09-18T15:00:00.000Z',
    to: '2026-09-19T20:00:00.000Z',
  },
  occurredAt: '2026-09-18T12:00:00.000Z',
});
const cancelled = event({
  type: 'BOOKING_CANCELLED',
  category: 'APPOINTMENT',
  actor: 'CUSTOMER',
  entityType: 'Booking',
  entityId: BOOKING_ID,
  subject: 'Corte clásico',
  occurredAt: '2026-09-22T12:00:00.000Z',
});
const allEvents = [cancelled, rescheduled, serviceCreated, event({})];

function json(body: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

async function installStubs(page: Page, activityRequests: URL[]) {
  await page.route(`${API_URL}/backoffice/auth/login`, (route) => {
    const response: BackofficeAuthResponse = {
      accessToken: 'fake-token',
      user: readOnlyUser,
    };
    return route.fulfill(json(response));
  });
  await page.route(`${API_URL}/backoffice/dashboard`, (route) =>
    route.fulfill(json(dashboard)),
  );
  await page.route(
    new RegExp(`${API_URL}/backoffice/trials(\\?.*)?$`),
    (route) => route.fulfill(json(trials)),
  );
  await page.route(
    `${API_URL}/backoffice/professionals/${PRO_ID}/activity/summary`,
    (route) => route.fulfill(json(summary)),
  );
  await page.route(
    new RegExp(
      `${API_URL}/backoffice/professionals/${PRO_ID}/activity(\\?.*)?$`,
    ),
    (route) => {
      const url = new URL(route.request().url());
      activityRequests.push(url);
      const category = url.searchParams.get('category');
      const response: ActivityListResponse = {
        items: category
          ? allEvents.filter((item) => item.category === category)
          : allEvents,
        nextCursor: null,
      };
      return route.fulfill(json(response));
    },
  );
}

test.describe('Backoffice · professional activity', () => {
  test('inspect a trial professional’s activity, filter it and read appointment metrics', async ({
    page,
  }) => {
    const activityRequests: URL[] = [];
    await installStubs(page, activityRequests);

    await page.goto('/backoffice/login');
    await page.getByLabel('Correo').fill('readonly@agendya.test');
    await page.getByLabel(/^Contraseña/).fill('supersecret123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/backoffice$/);

    // Backoffice → Pruebas → professional
    await page.getByRole('link', { name: 'Pruebas' }).click();
    await expect(page).toHaveURL(/\/backoffice\/trials$/);
    await expect(page.getByText('Quedan 15 días')).toBeVisible();
    await page.getByRole('link', { name: /Barbería Juan Pérez/ }).click();
    await expect(page).toHaveURL(
      new RegExp(`/backoffice/professionals/${PRO_ID}/activity$`),
    );

    // Trial overview + appointment metrics
    await expect(
      page.getByRole('heading', { name: 'Actividad · Barbería Juan Pérez' }),
    ).toBeVisible();
    await expect(page.getByText('Prueba activa').first()).toBeVisible();
    const citas = page
      .locator('div', {
        has: page.getByRole('heading', { name: /^Citas/ }),
      })
      .last();
    await expect(citas.getByText('Completadas')).toBeVisible();
    await expect(citas.getByText('31', { exact: true })).toBeVisible();
    await expect(citas.getByText('10 (12 cambios)')).toBeVisible();
    await expect(
      citas.getByText('7 (cliente 5 · profesional 2)'),
    ).toBeVisible();

    // Timeline defaults to the trial period
    await expect(
      page.getByRole('heading', { name: 'Actividad durante la prueba' }),
    ).toBeVisible();
    await expect(page.getByTestId('activity-event')).toHaveCount(4);
    await expect(
      page.getByText('Servicio "Corte clásico" creado'),
    ).toBeVisible();
    await expect(
      page.getByTestId('activity-event').getByText('Cita reprogramada'),
    ).toBeVisible();
    expect(activityRequests[0].searchParams.get('trialOnly')).toBe('true');

    // Filter to appointments only
    await page.getByLabel('Categoría').selectOption('APPOINTMENT');
    await expect(page.getByTestId('activity-event')).toHaveCount(2);
    await expect(
      page.getByTestId('activity-event').getByText('Cita cancelada'),
    ).toBeVisible();
    await expect(page.getByText('Servicio "Corte clásico" creado')).toHaveCount(
      0,
    );
    expect(activityRequests.at(-1)?.searchParams.get('category')).toBe(
      'APPOINTMENT',
    );

    // One appointment's history: whole period, scoped to that booking
    await page
      .getByRole('button', { name: 'Historial de esta cita' })
      .first()
      .click();
    await expect(
      page.getByText('Mostrando solo el historial de una cita.'),
    ).toBeVisible();
    const last = activityRequests.at(-1)!;
    expect(last.searchParams.get('entityId')).toBe(BOOKING_ID);
    expect(last.searchParams.get('trialOnly')).toBeNull();
    await expect(
      page.getByRole('link', { name: 'Ver cita' }).first(),
    ).toHaveAttribute('href', `/backoffice/appointments/${BOOKING_ID}`);
  });
});
