---
title: Performance
description: Build output, code splitting, lazy loading, image optimization, and the Lighthouse work done.
---

The web app had a dedicated performance pass (PR #30,
`AG-130-perform-a-full-performance-optimization…`, based on a Lighthouse
report). This page documents what is in the code.

## Code splitting

- **Route level** — every route except `LoginPage` is `React.lazy()` +
  `<Suspense>` in `AppRouter.tsx`. The dashboard subtree and the public
  booking wizard (a large multi-step form) load only when visited.
- **Vendor chunk** — `vite.config.ts` `manualChunks` pins
  `react` / `react-dom` / `react-router` / `react-router-dom` / `scheduler`
  into a `react-vendor` chunk that changes rarely, so app deploys don't
  invalidate it in the browser cache.

```js
// vite.config.ts
manualChunks(id) {
  if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
    return 'react-vendor';
  }
}
```

## Lazy loading

`lazy()` imports resolve the named export:

```ts
const AgendaPage = lazy(() =>
  import('../modules/bookings/AgendaPage').then((m) => ({ default: m.AgendaPage })),
);
```

`RouteFallback` renders a minimal "Cargando…" while a chunk loads.

## Fonts

Loaded as a single combined `<link rel="stylesheet">` (Google Fonts `css2`) in
`index.html`, **not** a CSS `@import`. A CSS `@import` is only discovered after
the app stylesheet parses, adding round trips before the first font request — a
measurable FCP hit. `preconnect` to `fonts.googleapis.com` /
`fonts.gstatic.com` is set. `display=swap` on the font URL.

## Theme without flash

`index.html` runs a tiny inline script **before first paint** that reads
`localStorage['agendya-theme']` (or `prefers-color-scheme`) and sets
`html[data-theme]` + `html.dark-theme`, so dark-mode users never see a light
flash. The Zustand store then keeps things in sync.

## Image optimization

| Stage | What |
| --- | --- |
| Before upload | `professionals/image.ts` — `createImageBitmap` + `<canvas>` downscale to a max dimension, re-encode (PNG/WebP keep alpha, else JPEG q0.85); returns the original if it's already small or decoding fails |
| At upload | Cloudinary transforms: logos `limit 400×400`, covers `limit 1600×600` |
| On delivery | `shared/image/cloudinary.ts` rewrites the URL with `f_auto,q_auto[,c_limit,w_<n>]` so Cloudinary serves WebP/AVIF at a perceptual-quality target (~30–50% smaller), skipping non-Cloudinary URLs and URLs that already carry a transform |

## API-side

- Booking/availability queries are backed by composite indexes tuned in
  migration `20260907120000_optimize_booking_indexes` (see
  [Indexes](/en/database/indexes/)) so hot paths don't scan historical rows.
- `getProfile` runs the profile fetch and the monthly-booking count with
  `Promise.all`.
- Prisma uses the `@prisma/adapter-pg` driver adapter over a `pg` pool.

## Build output

| App | Command | Output |
| --- | --- | --- |
| Web | `npm run build` (`tsc -b && vite build`) | `apps/web/dist/` — hashed assets, `react-vendor` + per-route chunks |
| API | `npm run build` (`nest build`) | `apps/api/dist/` — run with `node dist/main` |
| Types | `tsc` | `packages/types/dist/` |

:::note[Measuring]
There is no Lighthouse CI step in `.github/workflows/ci.yml`. Re-run Lighthouse
manually against a `vite preview` build when touching bundle size, route
splitting, fonts, or the critical CSS path.
:::
