import { z } from 'zod';

/**
 * The persistent in-app notification feed for a professional. The database row
 * (`Notification` in the Prisma schema) is the source of truth; real-time SSE
 * delivery and a future Web Push channel both carry this same shape.
 */

export const NOTIFICATION_TYPES = [
  'APPOINTMENT_CREATED',
  // Reserved for later delivery paths, not emitted yet:
  // 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_REMINDER', 'SYSTEM'
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

/**
 * Navigation + minimal display metadata. `bookingId` is the reference used for
 * deep-linking; the other fields let the feed render a row without re-fetching
 * the booking and are point-in-time (an APPOINTMENT_CREATED entry keeps
 * describing the appointment as it was when it was booked).
 */
export const notificationDataSchema = z.object({
  bookingId: z.string().uuid(),
  customerName: z.string(),
  serviceName: z.string(),
  /** ISO-8601 UTC instant of the appointment start. */
  startAt: z.string(),
});
export type NotificationData = z.infer<typeof notificationDataSchema>;

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  data: notificationDataSchema,
  /** ISO-8601 instant the professional read it, or `null` while unread. */
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

/** `GET /notifications` — keyset pagination on `(createdAt, id)` desc. */
export const notificationListQuerySchema = z.object({
  /** Opaque cursor from a previous response's `nextCursor`. */
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationSchema),
  /** Pass back as `?cursor=` to load the next page; `null` when there are none. */
  nextCursor: z.string().nullable(),
});
export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;

export const unreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;

export const markAllReadResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type MarkAllReadResponse = z.infer<typeof markAllReadResponseSchema>;

/**
 * `DELETE /notifications/:id` and `DELETE /notifications/read` — how many rows
 * were removed. `0` when the id was unknown, not owned by the caller, or still
 * unread (only read notifications are deletable), so both endpoints are
 * idempotent and never leak another professional's data via a 404.
 */
export const deleteNotificationsResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
});
export type DeleteNotificationsResponse = z.infer<
  typeof deleteNotificationsResponseSchema
>;
