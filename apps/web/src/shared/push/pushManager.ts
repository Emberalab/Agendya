import type { PushSubscribeInput } from '@agendya/types';
import {
  deletePushSubscription,
  getVapidPublicKey,
  sendPushSubscription,
} from '../../modules/notifications/push';

/**
 * Browser-side Web Push plumbing: feature detection, permission, and the
 * `PushManager` subscribe/unsubscribe dance, kept out of React so it can be
 * unit-tested and reused. The REST half lives in
 * `modules/notifications/push.ts`.
 */

/** Whether this browser can do Web Push at all (SW + PushManager + Notification). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermission(): NotificationPermission {
  return isPushSupported() ? Notification.permission : 'denied';
}

/**
 * Turns the base64url VAPID key into the `Uint8Array` `pushManager.subscribe`
 * expects for `applicationServerKey`.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  // Back the array with a concrete ArrayBuffer so it satisfies `BufferSource`
  // for `applicationServerKey` under TS's generic-typed-array types.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** The subscription currently held for this browser, or `null`. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Requests permission (if not already decided), subscribes via `PushManager`,
 * and registers the subscription with the API. Resolves `false` if the user
 * denied permission or push is unavailable; throws only on an unexpected error.
 */
export async function enablePush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') return false;

  const publicKey = await getVapidPublicKey();
  if (!publicKey) return false; // server has no VAPID keys → push disabled

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await sendPushSubscription(toPayload(subscription));
  return true;
}

/** Unsubscribes locally and tells the API to drop the row. Best-effort. */
export async function disablePush(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  try {
    await subscription.unsubscribe();
  } finally {
    await deletePushSubscription(endpoint).catch(() => undefined);
  }
}

function toPayload(subscription: PushSubscription): PushSubscribeInput {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
  };
}
