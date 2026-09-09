import { z } from 'zod';
import { notificationSchema } from './notification.schema';

/**
 * Real-time events pushed to an authenticated professional over the SSE stream
 * (`GET /realtime/stream`). The transport is server -> client only; the
 * dashboard performs every action through the REST API, so there is no
 * client -> server message shape here.
 *
 * The stream is a best-effort *delivery channel* for the persistent
 * notification feed (`notification.schema.ts` / the `Notification` DB row),
 * never the source of truth: a client that was offline recovers the same
 * information from `GET /notifications` on reconnect.
 */

export const REALTIME_EVENT_TYPES = ['notification.created'] as const;

export const notificationCreatedEventSchema = z.object({
  type: z.literal('notification.created'),
  notification: notificationSchema,
});

export type NotificationCreatedEvent = z.infer<
  typeof notificationCreatedEventSchema
>;

/**
 * Discriminated union of everything the stream can emit. Kept as a union so new
 * event types can be added without changing consumers that already narrow on
 * `type`.
 */
export const realtimeEventSchema = z.discriminatedUnion('type', [
  notificationCreatedEventSchema,
]);

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
