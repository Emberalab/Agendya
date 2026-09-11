/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  matchPrecache,
  type PrecacheEntry,
} from 'workbox-precaching';

/**
 * Custom service worker (vite-plugin-pwa `injectManifest` strategy).
 *
 * Three jobs:
 *  1. Precache the SPA shell so the installed PWA opens offline — Workbox
 *     replaces `self.__WB_MANIFEST` with the built asset list.
 *  2. Serve the app for every same-origin navigation network-first, falling
 *     back to the precached `index.html` shell when the network is gone — so a
 *     hard refresh or a deep link opens offline too, not just the manifest
 *     `start_url`, while an online visit still always gets the freshest HTML
 *     (never a stale shell). `/api/*` is skipped so proxied REST + SSE requests
 *     are untouched (they are never navigations anyway — belt and braces).
 *  3. Web Push: turn a `push` payload from the API
 *     (`PushSubscriptionsService.sendToProfessional`) into a native OS
 *     notification, and route a tap to the right agenda deep-link.
 *
 * The payload shape mirrors `PushMessage` from `@agendya/types`; it is
 * re-declared here rather than imported so the worker bundle stays free of app
 * code. Keep the two in sync.
 */

declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & {
    // Injected by Workbox at build time (see vite.config.ts injectManifest).
    __WB_MANIFEST: Array<PrecacheEntry | string>;
  };

interface PushMessage {
  title: string;
  body: string;
  notificationId: string;
  bookingId: string;
  startAt: string;
}

const AGENDA_PATH = '/dashboard/agenda';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation handler (job 2 above): network-first with an offline fallback
// to the precached shell. Kept as a hand-written `fetch` listener rather than
// `workbox-routing` so the worker bundle — and the dev-mode module worker —
// depends only on `workbox-precaching`.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate') return;
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        return (
          (await matchPrecache('index.html')) ??
          Response.error()
        );
      }
    })(),
  );
});

// `registerType: 'autoUpdate'` — take over as soon as the new worker is ready
// instead of waiting for every tab to close.
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const message = parseMessage(event.data);
  if (!message) return;

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Collapse repeat pushes for the same booking into one notification.
      tag: `booking-${message.bookingId}`,
      data: { url: deepLink(message) },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const target = data?.url ?? AGENDA_PATH;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Reuse an open dashboard tab if there is one; otherwise open a window.
      for (const client of clients) {
        await client.focus();
        try {
          await client.navigate(target);
        } catch {
          // Detached/cross-origin — fall through to openWindow below.
        }
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});

function parseMessage(data: PushMessageData | null): PushMessage | null {
  if (!data) return null;
  try {
    const raw = data.json() as Partial<PushMessage> | null;
    if (
      raw &&
      typeof raw.title === 'string' &&
      typeof raw.body === 'string' &&
      typeof raw.bookingId === 'string' &&
      typeof raw.notificationId === 'string' &&
      typeof raw.startAt === 'string'
    ) {
      return raw as PushMessage;
    }
  } catch {
    // Malformed payload — ignore rather than show a broken notification.
  }
  return null;
}

function deepLink(message: PushMessage): string {
  const params = new URLSearchParams({ booking: message.bookingId });
  const day = message.startAt.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) params.set('date', day);
  return `${AGENDA_PATH}?${params.toString()}`;
}
