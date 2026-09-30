import { z } from 'zod';
import { planSchema } from '../plans/catalog';
import { trialEventSchema } from './admin.schema';
import { weekdaySchema } from './schedule.schema';

/**
 * Product activity of a professional account — "how is this professional
 * using Agendya?". Deliberately separate from the Backoffice `AuditLog`
 * ("what did our staff do?"): different actor (the professional, their
 * customers, or the system — never an InternalUser), different consumers.
 *
 * Only meaningful, persisted actions are recorded (see `apps/api`
 * `ActivityService`). Business metrics (bookings, services, schedule) are
 * derived from the business tables themselves, not from these rows.
 */

export const ACTIVITY_CATEGORIES = [
  'ACCOUNT',
  'CONFIGURATION',
  'SERVICE',
  'SCHEDULE',
  'APPOINTMENT',
  'NOTIFICATION',
] as const;
export const activityCategorySchema = z.enum(ACTIVITY_CATEGORIES);
export type ActivityCategory = z.infer<typeof activityCategorySchema>;

export const ACTIVITY_EVENT_TYPES = [
  'ACCOUNT_CREATED',
  'LOGGED_IN',
  'PASSWORD_RESET',
  'DASHBOARD_VISITED',
  'PROFILE_UPDATED',
  'SERVICE_CREATED',
  'SERVICE_UPDATED',
  'SERVICE_DELETED',
  'WORKING_HOURS_UPDATED',
  'SCHEDULE_EXCEPTION_CREATED',
  'SCHEDULE_EXCEPTION_DELETED',
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'PUSH_ENABLED',
  'PUSH_DISABLED',
] as const;
export const activityEventTypeSchema = z.enum(ACTIVITY_EVENT_TYPES);
export type ActivityEventType = z.infer<typeof activityEventTypeSchema>;

/**
 * Each type belongs to exactly one category. The category is also stored on
 * the row so the timeline can filter by it through an index.
 */
export const ACTIVITY_EVENT_CATEGORY: Record<
  ActivityEventType,
  ActivityCategory
> = {
  ACCOUNT_CREATED: 'ACCOUNT',
  LOGGED_IN: 'ACCOUNT',
  PASSWORD_RESET: 'ACCOUNT',
  DASHBOARD_VISITED: 'ACCOUNT',
  PROFILE_UPDATED: 'CONFIGURATION',
  SERVICE_CREATED: 'SERVICE',
  SERVICE_UPDATED: 'SERVICE',
  SERVICE_DELETED: 'SERVICE',
  WORKING_HOURS_UPDATED: 'SCHEDULE',
  SCHEDULE_EXCEPTION_CREATED: 'SCHEDULE',
  SCHEDULE_EXCEPTION_DELETED: 'SCHEDULE',
  BOOKING_CREATED: 'APPOINTMENT',
  BOOKING_UPDATED: 'APPOINTMENT',
  BOOKING_RESCHEDULED: 'APPOINTMENT',
  BOOKING_CANCELLED: 'APPOINTMENT',
  BOOKING_COMPLETED: 'APPOINTMENT',
  PUSH_ENABLED: 'NOTIFICATION',
  PUSH_DISABLED: 'NOTIFICATION',
};

/**
 * Who caused the event. PROFESSIONAL = the account owner acting in the
 * dashboard; CUSTOMER = someone booking/changing through the public page or
 * a booking link; SYSTEM = a scheduled job.
 */
export const ACTIVITY_ACTORS = ['PROFESSIONAL', 'CUSTOMER', 'SYSTEM'] as const;
export const activityActorSchema = z.enum(ACTIVITY_ACTORS);
export type ActivityActor = z.infer<typeof activityActorSchema>;

export const activityEventSchema = z.object({
  id: z.string().uuid(),
  type: activityEventTypeSchema,
  category: activityCategorySchema,
  actor: activityActorSchema,
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  /** Human name of the affected entity (service name, date…), searchable. */
  subject: z.string().nullable(),
  /** Safe, non-secret context. Never customer contact data or credentials. */
  metadata: z.record(z.string(), z.unknown()).nullable(),
  /** Reconstructed from existing timestamps when the log was introduced. */
  backfilled: z.boolean(),
  occurredAt: z.string().datetime(),
});
export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const ACTIVITY_PAGE_SIZE_DEFAULT = 30;
export const ACTIVITY_PAGE_SIZE_MAX = 100;

const booleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const activityListQuerySchema = z.object({
  /** Restrict to the professional's trial window (intersected with from/to). */
  trialOnly: booleanQuerySchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  category: activityCategorySchema.optional(),
  type: activityEventTypeSchema.optional(),
  actor: activityActorSchema.optional(),
  /** Only events about this entity (e.g. one appointment's history). */
  entityId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  order: z.enum(['desc', 'asc']).default('desc'),
  cursor: z.string().uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ACTIVITY_PAGE_SIZE_MAX)
    .default(ACTIVITY_PAGE_SIZE_DEFAULT),
});
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
/** What a client sends (booleans travel as query strings). */
export type ActivityListParams = Omit<
  Partial<ActivityListQuery>,
  'trialOnly'
> & { trialOnly?: 'true' | 'false' };

export const activityListResponseSchema = z.object({
  items: z.array(activityEventSchema),
  nextCursor: z.string().nullable(),
});
export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;

// --- Summary (derived metrics) -------------------------------------------

export const TRIAL_STATUSES = ['ACTIVE', 'ENDED', 'NONE'] as const;
export const trialStatusSchema = z.enum(TRIAL_STATUSES);
export type TrialStatus = z.infer<typeof trialStatusSchema>;

/** Window used by the summary when the account never had a trial. */
export const ACTIVITY_FALLBACK_WINDOW_DAYS = 30;

const count = z.number().int().nonnegative();
const nullableDate = z.string().datetime().nullable();

export const workingDaySummarySchema = z.object({
  dayOfWeek: weekdaySchema,
  /** [startMinute, endMinute] pairs, sorted. */
  blocks: z.array(z.tuple([z.number().int(), z.number().int()])),
});
export type WorkingDaySummary = z.infer<typeof workingDaySummarySchema>;

export const activitySummarySchema = z.object({
  professional: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    businessName: z.string(),
    slug: z.string(),
    timezone: z.string(),
    createdAt: z.string().datetime(),
    plan: planSchema,
    effectivePlan: planSchema,
  }),
  trial: z.object({
    status: trialStatusSchema,
    startedAt: nullableDate,
    endsAt: nullableDate,
    daysRemaining: count,
    /** Newest first. */
    history: z.array(trialEventSchema),
  }),
  /**
   * The period every "in window" metric below is computed over: the trial
   * (start → end, or now while active), or the last
   * {@link ACTIVITY_FALLBACK_WINDOW_DAYS} days for an account without one.
   */
  window: z.object({
    basis: z.enum(['TRIAL', 'RECENT']),
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  /** Bookings created inside the window, by their current status. */
  appointments: z.object({
    total: count,
    online: count,
    manual: count,
    pending: count,
    confirmed: count,
    completed: count,
    cancelled: count,
    cancelledByCustomer: count,
    cancelledByProfessional: count,
    noShow: count,
    expired: count,
    /** Distinct bookings with at least one recorded reschedule in the window. */
    rescheduled: count,
    rescheduleEvents: count,
  }),
  customers: z.object({
    /** Distinct customer phone numbers among the window's bookings. */
    distinct: count,
    /** Of those, how many booked more than once in the window. */
    returning: count,
  }),
  /** Current configuration state (not windowed). */
  configuration: z.object({
    profile: z.object({
      hasCategory: z.boolean(),
      hasDescription: z.boolean(),
      hasLogoOrPhoto: z.boolean(),
      hasCoverImage: z.boolean(),
    }),
    services: z.object({
      total: count,
      active: count,
      planLocked: count,
    }),
    schedule: z.object({
      workingDays: count,
      timeBlocks: count,
      days: z.array(workingDaySummarySchema),
      upcomingBlockedDates: count,
    }),
    pushDevices: count,
  }),
  /** Activity inside the window. */
  usage: z.object({
    servicesCreated: count,
    servicesUpdated: count,
    servicesDeleted: count,
    scheduleChanges: count,
    blockedDatesCreated: count,
    profileUpdates: count,
    notificationsReceived: count,
    notificationsRead: count,
    supportTicketsOpened: count,
  }),
  engagement: z.object({
    /** First/last event performed by the professional themselves (all time). */
    firstActivityAt: nullableDate,
    lastActivityAt: nullableDate,
    /** Distinct days (professional's time zone) with own activity, in window. */
    activeDays: count,
    windowDays: count,
    daysSinceLastActivity: count.nullable(),
    lastBookingCreatedAt: nullableDate,
  }),
  /** "How quickly did they set up?" — first occurrence, all time. */
  milestones: z.object({
    accountCreatedAt: z.string().datetime(),
    firstServiceAt: nullableDate,
    firstScheduleAt: nullableDate,
    firstBookingAt: nullableDate,
    firstManualBookingAt: nullableDate,
  }),
  /** One entry per day of the window (professional's time zone), oldest first. */
  daily: z.array(
    z.object({
      date: z.string(),
      professionalEvents: count,
      // Bookings created that day, any source.
      bookingsCreated: count,
    }),
  ),
  /**
   * Earliest live (non-backfilled) event for this account. Anything before
   * it — reschedules, edits, logins — was never recorded, so absence of such
   * events before this instant means "unknown", not "didn't happen".
   */
  trackedSince: nullableDate,
});
export type ActivitySummary = z.infer<typeof activitySummarySchema>;

// --- Trial accounts list ---------------------------------------------------

export const trialListQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'ENDED', 'ALL']).default('ALL'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});
export type TrialListQuery = z.infer<typeof trialListQuerySchema>;

export const trialAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  slug: z.string(),
  status: trialStatusSchema,
  startedAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  daysRemaining: count,
  lastActivityAt: nullableDate,
  /** Bookings created during the trial window. */
  bookingsInTrial: count,
});
export type TrialAccount = z.infer<typeof trialAccountSchema>;

export const trialListResponseSchema = z.object({
  items: z.array(trialAccountSchema),
  nextCursor: z.string().nullable(),
});
export type TrialListResponse = z.infer<typeof trialListResponseSchema>;
