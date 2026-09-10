---
title: Environment variables
description: >-
  Every environment variable read by the API and the web app, with defaults and
  what breaks when it is missing.
---

:::danger[Never commit secrets]
`.env` is gitignored for both apps. Keep `.env.example` in sync when you add a
variable, but only with placeholder values. Share real `RESEND_API_KEY` /
`CLOUDINARY_URL` / Google credentials through a password manager, never plain
text or a PR.
:::

## API — `apps/api/.env`

Read via `apps/api/src/config/configuration.ts` (mapped into typed
`ConfigService` keys). Loaded by `apps/api/src/env.ts` (`dotenv`) before Nest
boots.

| Variable | Example / default | Required? | Effect when unset |
| --- | --- | --- | --- |
| `DATABASE_URL` | `postgresql://agendya:agendya_dev_password@localhost:5433/agendya_dev?schema=public` | **Yes** | Prisma cannot connect; API fails to start |
| `JWT_SECRET` | `dev-secret-change-in-production` | **Yes** | Tokens cannot be signed/verified |
| `JWT_EXPIRES_IN` | `7d` | No (defaults `7d`) | Falls back to `7d` |
| `GOOGLE_CLIENT_ID` | *(empty)* | No | Google OAuth strategy is not registered; `/auth/google` unavailable |
| `GOOGLE_CLIENT_SECRET` | *(empty)* | No | Same as above |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/auth/google/callback` | No | Defaults to the localhost callback |
| `SLOT_GRID_MINUTES` | `15` | No (defaults `15`) | Availability slot granularity in minutes |
| `RESEND_API_KEY` | *(empty)* | No | Emails are logged to the console instead of sent |
| `CLOUDINARY_URL` | *(empty)* | No | `POST /upload/image` returns `503 Service Unavailable` |
| `PORT` | `4000` | No (defaults `4000`) | API listen port |
| `WEB_URL` | `http://localhost:5173` | No (defaults localhost) | Dashboard CORS origin, OAuth success redirect base |
| `PUBLIC_WEB_URL` | *(empty)* | No | Public booking origin (`https://agendya.co`): extra CORS origin and cancel-link base. Falls back to `WEB_URL` |
| `REALTIME_HEARTBEAT_MS` | `25000` | No (defaults `25000`) | Milliseconds between `event: ping` frames on the `GET /realtime/stream` SSE stream. Lower it if a reverse proxy drops idle connections sooner |

### Test-only

| Variable | Used by | Effect |
| --- | --- | --- |
| `DISABLE_SCHEDULED_JOBS=true` | `RemindersScheduler`, `ExpirationScheduler` | Cron bodies early-return, so the e2e suite's serializable booking transactions aren't raced by the schedulers |

:::caution[Placeholder JWT secret is flagged]
`bootstrap.ts` logs a warning if `JWT_SECRET` is still
`dev-secret-change-in-production` (the `.env.example` value). Generate a strong,
unique secret before any real deployment.
:::

## Web — `apps/web/.env`

| Variable | Default | Effect |
| --- | --- | --- |
| `VITE_API_URL` | *(unset)* → `http://<page-host>:4000` | Base URL the browser calls for the API. Leave unset for localhost **and** LAN testing (`npm run dev:web:host`); set it only to target a different backend (e.g. staging). |
| `VITE_PUBLIC_SITE_URL` | *(unset)* → `window.location.origin` | Public page origin (`/{slug}`). Prod: `https://agendya.co`. Hosted-dev: `https://app-dev.agendya.co`. |

`apiClient` resolves it as:

```ts
const apiBaseUrl =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;
```

### E2E-only (`apps/web/tests/`)

`E2E_PORT`, `E2E_BASE_URL`, `E2E_API_URL`, `E2E_USER_EMAIL`,
`E2E_USER_BUSINESS_NAME`, `E2E_ACCESS_TOKEN` — all defaulted in
`playwright.config.ts` / the auth-setup fixture. No real secrets; the API is
stubbed at the network boundary.

## CI environment

`.github/workflows/ci.yml` sets `DATABASE_URL` (pointing at the Postgres 16
service container on `:5432`), `JWT_SECRET: ci-test-secret`, `JWT_EXPIRES_IN`,
`SLOT_GRID_MINUTES`, `PORT`. No third-party credentials — the Google strategy
is skipped and mail/upload are exercised only in their unconfigured paths.
