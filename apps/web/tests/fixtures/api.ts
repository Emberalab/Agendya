import type { Page, Route } from '@playwright/test';
import type {
  AgendaBooking,
  AuthUser,
  Notification,
  ProfessionalForPlanChange,
  ProfessionalProfile,
  PublicBooking,
  RegistrationEntry,
  Service,
  TrialEvent,
  WorkingHour,
} from '@agendya/types';
import {
  PUBLIC_SLUG,
  SUPER_ADMIN_USER,
  TEST_ACCESS_TOKEN,
  TEST_USER,
  makeAdminAccounts,
  makeAgendaBookings,
  makeAvailabilitySlots,
  makeProfile,
  makePublicProfessional,
  makeScheduleExceptions,
  makeServices,
  makeWorkingHours,
} from './data';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

/** Hosts whose assets are irrelevant to the flows under test — blocked for speed and hermeticity. */
const THIRD_PARTY =
  /(images\.unsplash\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/;

interface RecordedCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

interface OverrideResponse {
  status?: number;
  body?: unknown;
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body ?? {}),
  });
}

function readBody(route: Route): unknown {
  try {
    return route.request().postDataJSON();
  } catch {
    return undefined;
  }
}

/**
 * In-memory stand-in for the Agendya REST API, wired through `page.route`.
 *
 * It holds just enough mutable state for the tested flows (profile edits,
 * service create/delete, booking cancel) to behave like a real round-trip, and
 * records every call on `.calls` for assertions. `overrideOnce` lets a single
 * test force an error or a specific payload without disturbing the defaults.
 */
export class ApiMock {
  readonly calls: RecordedCall[] = [];

  private profile: ProfessionalProfile = makeProfile();
  private services: Service[] = makeServices();
  private agenda: AgendaBooking[] = makeAgendaBookings();
  private workingHours = makeWorkingHours();
  private exceptions = makeScheduleExceptions();
  private readonly publicProfessional = makePublicProfessional();
  private authUser: AuthUser = TEST_USER;
  private adminAccounts: ProfessionalForPlanChange[] = makeAdminAccounts();

  /**
   * Body served for the real-time SSE stream (`GET /realtime/stream`). A
   * fulfilled response cannot stay open, so the web client just reads this and
   * reconnects on its backoff. Default: a keep-alive comment (no events).
   */
  private realtimeBody = ':keep-alive\n\n';

  /** Persisted notification feed served by `GET /notifications`. Newest first. */
  private notifications: Notification[] = [];

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route(THIRD_PARTY, (route) => route.abort());
    await this.page.route(`${API_URL}/**`, (route) => this.dispatch(route));
  }

  setPlan(plan: ProfessionalProfile['plan']): void {
    this.profile.plan = plan;
    this.profile.monthlyBookingLimit = plan === 'FREE' ? 100 : null;
  }

  /**
   * Mirror what the API resolves server-side: an active trial makes the
   * effective plan BUSINESS (no monthly cap); otherwise the billed plan.
   */
  setTrial(trial: ProfessionalProfile['trial']): void {
    this.profile.trial = trial;
    this.profile.effectivePlan = trial?.active ? 'BUSINESS' : this.profile.plan;
    this.profile.monthlyBookingLimit =
      this.profile.effectivePlan === 'FREE' ? 100 : null;
  }

  /** Serve `/auth/me` as the platform admin (pair with a seeded admin session). */
  asSuperAdmin(): void {
    this.authUser = SUPER_ADMIN_USER;
  }

  setServices(services: Service[]): void {
    this.services = services;
  }

  setAgenda(bookings: AgendaBooking[]): void {
    this.agenda = bookings;
  }

  setWorkingHours(hours: WorkingHour[]): void {
    this.workingHours = hours;
  }

  /**
   * Queue a real-time event to be delivered on the next `/realtime/stream`
   * connection (the web client opens one on dashboard load and reconnects
   * every ~1s while a response keeps ending).
   */
  emitRealtime(event: unknown): void {
    this.realtimeBody = `data: ${JSON.stringify(event)}\n\n`;
  }

  /** Preload the persisted feed (e.g. to model a professional who was offline). */
  seedNotifications(items: Notification[]): void {
    this.notifications = [...items];
  }

  /**
   * Model "customer books an appointment": persist the notification AND queue
   * the `notification.created` SSE frame the dashboard reacts to.
   */
  emitNotification(notification: Notification): void {
    this.notifications = [notification, ...this.notifications];
    this.emitRealtime({ type: 'notification.created', notification });
  }

  /**
   * Make the next request matching `method` + `matcher` (tested against the
   * pathname) resolve with `response`, then step aside. Non-matching requests
   * fall straight through to the defaults, so a page-load GET never "spends" an
   * override meant for a later POST/PATCH.
   */
  async overrideOnce(
    method: string,
    matcher: RegExp,
    response: OverrideResponse,
  ): Promise<void> {
    const handler = async (route: Route): Promise<void> => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() !== method.toUpperCase() || !matcher.test(path)) {
        return route.fallback();
      }
      await this.page.unroute(`${API_URL}/**`, handler);
      this.record(route);
      return json(route, response.body ?? {}, response.status ?? 200);
    };
    await this.page.route(`${API_URL}/**`, handler);
  }

  private record(route: Route): void {
    const request = route.request();
    const url = new URL(request.url());
    this.calls.push({
      method: request.method(),
      path: url.pathname,
      query: url.searchParams,
      body: readBody(route),
    });
  }

  private async dispatch(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    this.record(route);
    const body = readBody(route);

    // --- Real-time SSE stream ----------------------------------------------
    if (path === '/realtime/stream') {
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'cache-control': 'no-store' },
        body: this.realtimeBody,
      });
    }

    // --- Auth -----------------------------------------------------------------
    if (path === '/auth/login' || path === '/auth/register') {
      return json(route, {
        accessToken: TEST_ACCESS_TOKEN,
        user: this.authUser,
      });
    }
    if (path === '/auth/me') {
      return json(route, this.authUser);
    }

    // --- Admin (Super Admin backoffice) --------------------------------------
    if (path.startsWith('/admin/')) {
      return this.dispatchAdmin(route, path, method, url, body);
    }

    // --- Professional profile ----------------------------------------------
    if (path === '/professionals/me' && method === 'GET') {
      return json(route, this.profile);
    }
    if (path === '/professionals/me' && method === 'PATCH') {
      this.profile = {
        ...this.profile,
        ...(body as Partial<ProfessionalProfile>),
      };
      return json(route, this.profile);
    }
    if (path === '/professionals/check-slug') {
      return json(route, { available: true });
    }
    if (path === '/upload/image') {
      return json(route, {
        url: 'https://res.cloudinary.com/demo/image/upload/e2e.png',
      });
    }

    // --- Services ---------------------------------------------------------
    if (path === '/services' && method === 'GET') {
      return json(route, this.services);
    }
    if (path === '/services' && method === 'POST') {
      const created: Service = {
        ...makeServices()[0],
        ...(body as Partial<Service>),
        id: `e2e-service-${this.services.length + 1}`,
        sortOrder: this.services.length,
      };
      this.services = [...this.services, created];
      return json(route, created, 201);
    }
    const serviceIdMatch = path.match(/^\/services\/([^/]+)$/);
    if (serviceIdMatch && method === 'PATCH') {
      const id = serviceIdMatch[1];
      this.services = this.services.map((service) =>
        service.id === id
          ? { ...service, ...(body as Partial<Service>) }
          : service,
      );
      const updated = this.services.find((service) => service.id === id);
      return json(route, updated ?? {}, updated ? 200 : 404);
    }
    if (serviceIdMatch && method === 'DELETE') {
      const id = serviceIdMatch[1];
      const removed = this.services.find((service) => service.id === id);
      this.services = this.services.filter((service) => service.id !== id);
      return json(
        route,
        removed ? { ...removed, isActive: false } : {},
        removed ? 200 : 404,
      );
    }
    const duplicateMatch = path.match(/^\/services\/([^/]+)\/duplicate$/);
    if (duplicateMatch && method === 'POST') {
      const source = this.services.find(
        (service) => service.id === duplicateMatch[1],
      );
      if (!source) return json(route, {}, 404);
      const copy: Service = {
        ...source,
        id: `e2e-service-copy-${this.services.length + 1}`,
        name: `${source.name} (copia)`,
        sortOrder: this.services.length,
      };
      this.services = [...this.services, copy];
      return json(route, copy, 201);
    }

    // --- Notifications ------------------------------------------------------
    if (path === '/notifications' && method === 'GET') {
      const cursor = url.searchParams.get('cursor');
      const limit = Number(url.searchParams.get('limit') ?? '20');
      const start = cursor
        ? this.notifications.findIndex((n) => n.id === cursor) + 1
        : 0;
      const slice = this.notifications.slice(start, start + limit);
      const nextCursor =
        start + limit < this.notifications.length
          ? slice[slice.length - 1].id
          : null;
      return json(route, { items: slice, nextCursor });
    }
    if (path === '/notifications/unread-count' && method === 'GET') {
      return json(route, {
        count: this.notifications.filter((n) => n.readAt === null).length,
      });
    }
    // Web Push: the suite runs without VAPID keys, so the server reports push
    // disabled and the dashboard hides the toggle. Stubbed to keep the mock
    // exhaustive (no "unhandled route" noise) rather than to exercise push.
    if (path === '/notifications/push/public-key' && method === 'GET') {
      return json(route, { publicKey: null });
    }
    if (path === '/notifications/push/status' && method === 'GET') {
      return json(route, { subscribed: false });
    }
    if (path === '/notifications/read-all' && method === 'PATCH') {
      const now = new Date().toISOString();
      let updated = 0;
      this.notifications = this.notifications.map((n) => {
        if (n.readAt === null) {
          updated += 1;
          return { ...n, readAt: now };
        }
        return n;
      });
      return json(route, { updated });
    }
    const notifReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
    if (notifReadMatch && method === 'PATCH') {
      const id = notifReadMatch[1];
      const target = this.notifications.find((n) => n.id === id);
      if (!target) return json(route, { message: 'No encontrada' }, 404);
      target.readAt = target.readAt ?? new Date().toISOString();
      return json(route, target);
    }
    if (path === '/notifications/read' && method === 'DELETE') {
      const before = this.notifications.length;
      this.notifications = this.notifications.filter((n) => n.readAt === null);
      return json(route, { deleted: before - this.notifications.length });
    }
    const notifDeleteMatch = path.match(/^\/notifications\/([^/]+)$/);
    if (notifDeleteMatch && method === 'DELETE') {
      const id = notifDeleteMatch[1];
      const before = this.notifications.length;
      // Server only removes the caller's already-read rows.
      this.notifications = this.notifications.filter(
        (n) => !(n.id === id && n.readAt !== null),
      );
      return json(route, { deleted: before - this.notifications.length });
    }

    // --- Agenda (professional bookings) ---------------------------------
    if (path === '/bookings' && method === 'GET') {
      const from = url.searchParams.get('from') ?? '0000-00-00';
      const to = url.searchParams.get('to') ?? '9999-99-99';
      const inRange = this.agenda.filter((booking) => {
        const day = booking.startAt.slice(0, 10);
        return day >= from && day <= to;
      });
      return json(route, inRange);
    }
    const bookingActionMatch = path.match(
      /^\/bookings\/([^/]+)\/(cancel|complete|reschedule)$/,
    );
    if (bookingActionMatch && method === 'PATCH') {
      const [, id, action] = bookingActionMatch;
      const nextStatus =
        action === 'cancel'
          ? 'CANCELLED'
          : action === 'complete'
            ? 'COMPLETED'
            : undefined;
      this.agenda = this.agenda.map((booking) =>
        booking.id === id
          ? {
              ...booking,
              status: nextStatus ?? booking.status,
              startAt:
                action === 'reschedule' && body
                  ? ((body as { newStartAt?: string }).newStartAt ??
                    booking.startAt)
                  : booking.startAt,
              cancelledAt:
                action === 'cancel' ? new Date().toISOString() : null,
              cancelledBy: action === 'cancel' ? 'PROFESSIONAL' : null,
            }
          : booking,
      );
      const updated = this.agenda.find((booking) => booking.id === id);
      return json(route, updated ?? {}, updated ? 200 : 404);
    }

    // --- Schedules ------------------------------------------------------
    if (path === '/schedules/working-hours' && method === 'GET') {
      return json(route, this.workingHours);
    }
    if (path === '/schedules/working-hours' && method === 'PUT') {
      const days = (body as { days?: unknown[] })?.days ?? [];
      this.workingHours = days.map((entry, index) => ({
        id: `e2e-wh-${index}`,
        ...(entry as object),
      })) as typeof this.workingHours;
      return json(route, this.workingHours);
    }
    if (path === '/schedules/exceptions' && method === 'GET') {
      return json(route, this.exceptions);
    }
    if (path === '/schedules/exceptions' && method === 'POST') {
      const created = {
        id: `e2e-exc-${this.exceptions.length + 1}`,
        date: (body as { date?: string })?.date ?? '2026-12-25',
        reason: (body as { reason?: string | null })?.reason ?? null,
      };
      this.exceptions = [...this.exceptions, created];
      return json(route, created, 201);
    }
    if (/^\/schedules\/exceptions\/[^/]+$/.test(path) && method === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }

    // --- Public booking ----------------------------------------------
    const availabilityMatch = path.match(
      /^\/public\/professionals\/([^/]+)\/availability$/,
    );
    if (availabilityMatch && method === 'GET') {
      const date = url.searchParams.get('date') ?? '2026-08-03';
      return json(route, { slots: makeAvailabilitySlots(date) });
    }
    const publicBookingMatch = path.match(
      /^\/public\/professionals\/([^/]+)\/bookings$/,
    );
    if (publicBookingMatch && method === 'POST') {
      return json(route, this.buildPublicBooking(body), 201);
    }
    const publicProfMatch = path.match(/^\/public\/professionals\/([^/]+)$/);
    if (publicProfMatch && method === 'GET') {
      if (publicProfMatch[1] !== PUBLIC_SLUG) {
        return json(route, { message: 'No encontrado' }, 404);
      }
      return json(route, this.publicProfessional);
    }
    const tokenActionMatch = path.match(
      /^\/public\/bookings\/([^/]+)\/(cancel|reschedule)$/,
    );
    if (tokenActionMatch && method === 'POST') {
      return json(route, {
        ...this.buildPublicBooking(undefined),
        status: tokenActionMatch[2] === 'cancel' ? 'CANCELLED' : 'CONFIRMED',
      });
    }
    const tokenMatch = path.match(/^\/public\/bookings\/([^/]+)$/);
    if (tokenMatch && (method === 'GET' || method === 'PATCH')) {
      return json(
        route,
        this.buildPublicBooking(method === 'PATCH' ? body : undefined),
      );
    }

    // eslint-disable-next-line no-console
    console.warn(`[api-mock] unhandled ${method} ${path}`);
    return json(route, { message: `E2E: unmocked ${method} ${path}` }, 501);
  }

  /**
   * Minimal Super Admin backend: registrations, type-ahead search, account
   * detail and the trial grant/extend/end actions. Server rules that matter to
   * the UI (3-char minimum, one trial per account, active-only extend/end) are
   * mirrored so the specs exercise real round-trips.
   */
  private dispatchAdmin(
    route: Route,
    path: string,
    method: string,
    url: URL,
    body: unknown,
  ): Promise<void> {
    if (this.authUser.role !== 'SUPER_ADMIN') {
      return json(route, { message: 'Forbidden' }, 403);
    }
    const DAY_MS = 24 * 60 * 60 * 1000;

    if (path === '/admin/registrations' && method === 'GET') {
      const rows: RegistrationEntry[] = this.adminAccounts.map((a) => ({
        id: a.id,
        email: a.email,
        businessName: a.businessName,
        slug: a.slug,
        accessStatus: 'APPROVED',
        role: 'INDEPENDENT',
        plan: a.plan,
        trial: a.trial,
        createdAt: '2026-09-14T15:00:00.000Z',
      }));
      return json(route, rows);
    }

    if (path === '/admin/professionals' && method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      if (q.length < 3) return json(route, { message: 'q too short' }, 400);
      const matches = this.adminAccounts
        .filter(
          (a) =>
            a.email.toLowerCase().includes(q) ||
            a.businessName.toLowerCase().includes(q),
        )
        .map((a) => ({
          id: a.id,
          email: a.email,
          businessName: a.businessName,
          plan: a.plan,
          trialActive: a.trial?.active ?? false,
        }));
      return json(route, matches);
    }

    const match = path.match(
      /^\/admin\/professionals\/([^/]+)(?:\/trial(?:\/(extend|end))?)?$/,
    );
    const account = match
      ? this.adminAccounts.find((a) => a.email === decodeURIComponent(match[1]))
      : undefined;
    if (!match || !account) {
      return json(route, { message: 'No encontrado' }, 404);
    }
    const isTrial = path.includes('/trial');
    const action = match[2];
    const input = (body ?? {}) as {
      allowRepeat?: boolean;
      days?: number;
      note?: string;
    };
    const now = new Date();
    const record = (
      eventAction: TrialEvent['action'],
      previousEndsAt: string | null,
      endsAt: string,
    ) => {
      account.trialHistory = [
        {
          id: `00000000-0000-4000-8000-${String(account.trialHistory.length + 1).padStart(12, '0')}`,
          action: eventAction,
          actorEmail: this.authUser.email,
          previousEndsAt,
          endsAt,
          note: input.note ?? null,
          createdAt: now.toISOString(),
        },
        ...account.trialHistory,
      ];
    };

    if (!isTrial && method === 'GET') {
      return json(route, account);
    }

    if (isTrial && !action && method === 'POST') {
      if (account.trial?.active) {
        return json(route, { message: 'Ya tiene una prueba activa.' }, 409);
      }
      if (account.trial && !input.allowRepeat) {
        return json(
          route,
          { message: 'Esta cuenta ya usó su período de prueba.' },
          409,
        );
      }
      const endsAt = new Date(now.getTime() + 30 * DAY_MS).toISOString();
      record('GRANTED', account.trial?.endsAt ?? null, endsAt);
      account.trial = { startedAt: now.toISOString(), endsAt, active: true };
      account.effectivePlan = 'BUSINESS';
      return json(route, account, 201);
    }

    if ((action === 'extend' || action === 'end') && method === 'POST') {
      const trial = account.trial;
      if (!trial?.active) {
        return json(route, { message: 'Sin prueba activa.' }, 409);
      }
      const endsAt =
        action === 'extend'
          ? new Date(
              new Date(trial.endsAt).getTime() + (input.days ?? 0) * DAY_MS,
            ).toISOString()
          : now.toISOString();
      record(action === 'extend' ? 'EXTENDED' : 'ENDED', trial.endsAt, endsAt);
      account.trial = { ...trial, endsAt, active: action === 'extend' };
      account.effectivePlan = action === 'extend' ? 'BUSINESS' : account.plan;
      return json(route, account);
    }

    return json(route, { message: `E2E: unmocked ${method} ${path}` }, 501);
  }

  private buildPublicBooking(body: unknown): PublicBooking {
    const input = (body ?? {}) as Record<string, unknown>;
    const service = this.publicProfessional.services[0];
    return {
      id: '00000000-0000-4000-8000-0000000000e1',
      businessName: this.publicProfessional.businessName,
      professionalSlug: this.publicProfessional.slug,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      customerName: (input.customerName as string) ?? 'Ana Cliente',
      customerEmail: (input.customerEmail as string) ?? 'ana@example.com',
      customerPhone: (input.customerPhone as string) ?? '+57 300 1234567',
      customerNote: (input.customerNote as string) ?? null,
      atHome: Boolean(input.atHome),
      customerAddress: (input.customerAddress as string) ?? null,
      startAt: (input.startAt as string) ?? '2026-08-03T14:00:00.000Z',
      endAt: '2026-08-03T14:30:00.000Z',
      status: 'CONFIRMED',
      source: 'ONLINE',
      cancellationToken: 'e2e-cancellation-token',
      cancellationPolicyHours: 24,
      canCancel: true,
      canReschedule: true,
    };
  }
}
