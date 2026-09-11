import type { RealtimeEvent } from './realtime.schema';

/**
 * Zod-free structural check for a Server-Sent Events frame.
 *
 * The dashboard shell mounts the realtime client on every authenticated page,
 * so pulling Zod (and the schema-construction cost of `realtimeEventSchema`)
 * onto that path taxes the initial load of routes like `/dashboard/agenda` that
 * otherwise never touch Zod. This guard reproduces what
 * `realtimeEventSchema.safeParse(...)` guarantees the consumers in
 * `shared/realtime/realtimeClient.ts` and `modules/notifications/**` actually
 * read, with plain `typeof` checks and no dependency.
 *
 * `realtimeEventSchema` in ./realtime.schema.ts stays the authoritative shape
 * (and the source of the `RealtimeEvent` type) — keep the two in sync. Anything
 * that isn't a recognised, well-formed event is rejected (returns `null`),
 * exactly like `safeParse` failing.
 */
export function parseRealtimeEvent(raw: unknown): RealtimeEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const event = raw as Record<string, unknown>;
  if (event.type !== 'notification.created') return null;

  const notification = event.notification;
  if (typeof notification !== 'object' || notification === null) return null;
  const n = notification as Record<string, unknown>;

  if (
    typeof n.id !== 'string' ||
    typeof n.type !== 'string' ||
    typeof n.title !== 'string' ||
    typeof n.body !== 'string' ||
    typeof n.createdAt !== 'string' ||
    (n.readAt !== null && typeof n.readAt !== 'string')
  ) {
    return null;
  }

  const data = n.data;
  if (typeof data !== 'object' || data === null) return null;
  if (typeof (data as Record<string, unknown>).bookingId !== 'string') {
    return null;
  }

  return raw as RealtimeEvent;
}
