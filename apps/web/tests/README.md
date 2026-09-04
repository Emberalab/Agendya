# Web end-to-end tests (Playwright)

These specs drive the real production bundle in a real Chromium browser. They
sit alongside — not in place of — the Vitest unit/integration specs colocated in
`src/`.

## Running

```bash
npm run test:e2e            # headless run (starts / reuses the Vite dev server)
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:headed    # headed run
npm run test:e2e:report    # open the last HTML report
npm run test:e2e:install   # one-off: download the Chromium build
```

`npm run test` stays Vitest-only; `npm run typecheck` also type-checks this
folder via `tsconfig.e2e.json`.

## How it works

- **API**: the Agendya REST API is stubbed at the network boundary
  (`fixtures/api.ts`, installed automatically for every test). The backend needs
  Postgres, migrations and date-sensitive seed data to answer availability /
  agenda queries and its own e2e suite documents a serializable-transaction
  race; stubbing HTTP responses keeps the router, TanStack Query, forms and
  validation under test without that nondeterminism. `api.overrideOnce(...)`
  forces a one-off error or payload; `api.calls` records requests for
  assertions.
- **Third-party services** (Google OAuth, Cloudinary, Resend) are never
  contacted; their asset hosts are blocked for speed.
- **Auth**: `auth.setup.ts` seeds the `agendya-auth` `localStorage` entry the
  zustand store persists and snapshots it to `playwright/.auth/user.json`.
  Dashboard specs opt in with `test.use({ storageState: STORAGE_STATE })`.
  Test identity comes from `E2E_USER_EMAIL` / `E2E_USER_BUSINESS_NAME` /
  `E2E_ACCESS_TOKEN` (all defaulted); no real secrets.

## Layout

```
tests/
  auth.setup.ts            seeds the authenticated storage state
  fixtures/
    test.ts                extended `test` with the auto `api` fixture
    api.ts                 in-memory API stub + request recorder
    data.ts                deterministic professional / services / bookings
  utils/                   jwt + storage-state path helpers
  e2e/
    smoke.spec.ts          app loads, redirects, register link
    auth/login.spec.ts     email+password login, validation, server error
    navigation/            sidebar navigation, logout
    dashboard/             profile / services / agenda flows
    public-booking/        public landing + wizard start + not-found
```
