import { z } from 'zod';

/**
 * Web Push subscription plumbing. The browser's `PushManager.subscribe()`
 * returns a `PushSubscription` whose `.toJSON()` has exactly this shape; the
 * client POSTs it verbatim to `POST /notifications/push/subscribe`, and the API
 * stores one row per (professional, endpoint) in the `PushSubscription` table.
 *
 * Web Push is a best-effort *delivery channel* for the persistent notification
 * feed (`notification.schema.ts` / the `Notification` DB row), exactly like the
 * SSE stream — the row stays the source of truth.
 */

/** The `keys` object inside a browser `PushSubscription.toJSON()`. */
export const pushSubscriptionKeysSchema = z.object({
  /** P-256 ECDH public key, base64url. */
  p256dh: z.string().min(1),
  /** Shared auth secret, base64url. */
  auth: z.string().min(1),
});

/** A browser `PushSubscription.toJSON()` payload. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  /** Epoch ms the subscription expires, or `null` when open-ended. */
  expirationTime: z.number().nullable().optional(),
  keys: pushSubscriptionKeysSchema,
});
export type PushSubscriptionPayload = z.infer<typeof pushSubscriptionSchema>;

/** Body of `POST /notifications/push/subscribe`. */
export const pushSubscribeInputSchema = pushSubscriptionSchema;
export type PushSubscribeInput = z.infer<typeof pushSubscribeInputSchema>;

/** Body of `POST /notifications/push/unsubscribe`. */
export const pushUnsubscribeInputSchema = z.object({
  endpoint: z.string().url(),
});
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeInputSchema>;

/**
 * `GET /notifications/push/public-key` — the VAPID public key the client feeds
 * to `pushManager.subscribe({ applicationServerKey })`. `publicKey` is `null`
 * when the server has no VAPID keys configured, i.e. push is disabled.
 */
export const vapidPublicKeyResponseSchema = z.object({
  publicKey: z.string().nullable(),
});
export type VapidPublicKeyResponse = z.infer<
  typeof vapidPublicKeyResponseSchema
>;

/**
 * The JSON body the service worker receives in its `push` event. Kept in sync
 * with the `Notification` DTO so the SW can render a native notification and
 * deep-link the same way the in-app feed does.
 */
export const pushMessageSchema = z.object({
  title: z.string(),
  body: z.string(),
  /** Notification id, so a native tap can mark it read later if desired. */
  notificationId: z.string().uuid(),
  /** Booking this concerns — the SW builds the deep-link path from it. */
  bookingId: z.string().uuid(),
  /** ISO-8601 UTC start of the appointment; lets the SW widen the agenda range. */
  startAt: z.string(),
});
export type PushMessage = z.infer<typeof pushMessageSchema>;
