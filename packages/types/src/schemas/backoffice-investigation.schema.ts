import { z } from 'zod';
import { planSchema } from '../plans/catalog';
import { bookingStatusSchema } from './booking.schema';
import { weekdaySchema } from './schedule.schema';
import { notificationTypeSchema } from './notification.schema';
import {
  supportTicketSummarySchema,
  ticketProfessionalSummarySchema,
} from './ticket.schema';

/**
 * Backoffice-only read views. These are deliberately separate from the
 * customer-facing `professional.schema.ts` / `booking.schema.ts` shapes
 * (which are scoped to "what a professional may see about themselves") —
 * a support agent needs a different, wider slice of the same tables, and
 * keeping the two independent means a future change to the customer-facing
 * shape can't silently change what Backoffice exposes, or vice versa.
 */

export const GLOBAL_SEARCH_RESULT_LIMIT = 10;

export const backofficeSearchResultSchema = z.object({
  professionals: z.array(ticketProfessionalSummarySchema),
  tickets: z.array(supportTicketSummarySchema),
});
export type BackofficeSearchResult = z.infer<
  typeof backofficeSearchResultSchema
>;

export const backofficeSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});
export type BackofficeSearchQuery = z.infer<typeof backofficeSearchQuerySchema>;

// --- Professional 360° view ---------------------------------------------

export const backofficeBookingSummarySchema = z.object({
  id: z.string().uuid(),
  serviceName: z.string(),
  customerName: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  status: bookingStatusSchema,
  atHome: z.boolean(),
});
export type BackofficeBookingSummary = z.infer<
  typeof backofficeBookingSummarySchema
>;

export const backofficeWorkingHourSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: weekdaySchema,
  startMinute: z.number(),
  endMinute: z.number(),
});

export const backofficeScheduleExceptionSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  reason: z.string().nullable(),
});

export const backofficeNotificationSummarySchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const professional360Schema = z.object({
  account: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    businessName: z.string(),
    role: z.string(),
    plan: planSchema,
    isActive: z.boolean(),
    createdAt: z.string(),
    timezone: z.string(),
  }),
  business: z.object({
    businessName: z.string(),
    category: z.string().nullable(),
    slug: z.string(),
    description: z.string().nullable(),
    cancellationPolicyHours: z.number(),
    brandColor: z.string().nullable(),
  }),
  appointments: z.object({
    upcoming: z.array(backofficeBookingSummarySchema),
    recent: z.array(backofficeBookingSummarySchema),
    counts: z.object({
      completed: z.number().int().nonnegative(),
      cancelled: z.number().int().nonnegative(),
      noShow: z.number().int().nonnegative(),
      expired: z.number().int().nonnegative(),
    }),
  }),
  schedule: z.object({
    workingHours: z.array(backofficeWorkingHourSchema),
    exceptions: z.array(backofficeScheduleExceptionSchema),
  }),
  notifications: z.object({
    recent: z.array(backofficeNotificationSummarySchema),
  }),
  support: z.object({
    open: z.array(supportTicketSummarySchema),
    resolved: z.array(supportTicketSummarySchema),
  }),
});
export type Professional360 = z.infer<typeof professional360Schema>;

// --- Appointment troubleshooting view ------------------------------------

export const appointmentInvestigationSchema = z.object({
  booking: z.object({
    id: z.string().uuid(),
    customerName: z.string(),
    customerEmail: z.string(),
    customerPhone: z.string(),
    serviceNameSnapshot: z.string(),
    durationMinutesSnapshot: z.number(),
    startAt: z.string(),
    endAt: z.string(),
    status: bookingStatusSchema,
    atHome: z.boolean(),
    customerAddress: z.string().nullable(),
    cancelledAt: z.string().nullable(),
    cancelledBy: z.string().nullable(),
    reminder24hSentAt: z.string().nullable(),
    reminder2hSentAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  professional: ticketProfessionalSummarySchema,
  /** Working hours for the booking's weekday, as configured today. */
  workingHoursThatDay: z.array(backofficeWorkingHourSchema),
  /** Whether the booking's calendar date was (or is) a blocked/exception date. */
  scheduleException: backofficeScheduleExceptionSchema.nullable(),
  /** Notification rows whose payload references this booking. */
  relatedNotifications: z.array(backofficeNotificationSummarySchema),
  /** Tickets that reference this booking as `relatedBookingId`. */
  relatedTickets: z.array(supportTicketSummarySchema),
});
export type AppointmentInvestigation = z.infer<
  typeof appointmentInvestigationSchema
>;

// --- Dashboard -------------------------------------------------------------

export const backofficeDashboardSchema = z.object({
  openTickets: z.number().int().nonnegative(),
  urgentTickets: z.number().int().nonnegative(),
  waitingForCustomerTickets: z.number().int().nonnegative(),
  unassignedTickets: z.number().int().nonnegative(),
  recentTickets: z.array(supportTicketSummarySchema),
});
export type BackofficeDashboard = z.infer<typeof backofficeDashboardSchema>;
