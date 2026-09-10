---
title: System architecture
description: The full system, its processes, and the boundaries between them.
---

```mermaid
flowchart TB
  subgraph client["Client — browser"]
    direction TB
    R["React Router 7<br/>route-level code splitting"]
    Q["TanStack Query<br/>server-state cache"]
    Z["Zustand<br/>auth + theme (persisted)"]
    AC["apiClient<br/>fetch wrapper, injects JWT"]
    R --> Q --> AC
    Z --> AC
  end

  subgraph api["API — NestJS 11 (Node 24)"]
    direction TB
    MW["helmet + CORS<br/>(bootstrap.ts)"]
    TG["ThrottlerGuard (global)<br/>100 req / 60s default"]
    subgraph modules
      AU["AuthModule"]
      PR["ProfessionalsModule"]
      SV["ServicesModule"]
      SC["SchedulesModule"]
      BK["BookingsModule"]
      UP["UploadModule"]
    end
    CRON["ScheduleModule crons<br/>*/15 * * * *"]
    MW --> TG --> modules
  end

  DB[("PostgreSQL 16")]
  GO["Google OAuth 2.0"]
  RS["Resend"]
  CL["Cloudinary"]

  AC -- "HTTPS / JSON" --> MW
  modules --> DB
  CRON --> DB
  AU <--> GO
  BK --> RS
  CRON --> RS
  UP --> CL
```

## Processes

| Process | Runtime | Responsibilities |
| --- | --- | --- |
| **Web** | Static bundle served to the browser (Vite build) | UI, routing, client state, form validation, calling the API |
| **API** | One Node.js process | HTTP routing, auth, validation, business rules, DB access, email, uploads, **and** the in-process cron jobs |

The cron schedulers (`RemindersScheduler`, `ExpirationScheduler`) run **inside
the API process** via `@nestjs/schedule` `ScheduleModule.forRoot()` — there is
no separate worker. Every `@Cron` job is `*/15 * * * *` (every 15 minutes) and
guards on `DISABLE_SCHEDULED_JOBS`.

## Trust boundaries

```mermaid
flowchart LR
  U["Public internet<br/>(customers, unauthenticated)"] -->|"/public/** , /auth/**"| API
  P["Authenticated professional<br/>(JWT bearer)"] -->|"/professionals , /services , /schedules , /bookings , /upload"| API
  API -->|"server-to-server secrets"| EXT["Google · Resend · Cloudinary"]
  API -->|"connection string"| DB[("PostgreSQL")]
```

- **Unauthenticated** surface: `GET /`, `GET /health`, `POST /auth/register`,
  `POST /auth/login`, the Google OAuth routes, and everything under
  `/public/**` (professional-by-slug, availability, create booking, and the
  token-scoped booking read/update/cancel/reschedule).
- **Authenticated** surface: guarded by `JwtAuthGuard` — `/auth/me`,
  `/professionals/**` (except the public sub-controller), `/services/**`,
  `/schedules/**`, `/bookings` (agenda + professional actions), `/upload/**`.
- Ownership is always re-checked in the service layer with
  `where: { id, professionalId }` — a valid JWT for professional A cannot touch
  professional B's rows.

## Cross-cutting concerns

| Concern | Where |
| --- | --- |
| Security headers | `helmet()` in `bootstrap.ts` (full CSP — JSON API, no HTML) |
| CORS | Custom origin function in `bootstrap.ts` + `common/utils/cors.util.ts` (configured `WEB_URL` + `PUBLIC_WEB_URL` + any localhost/private-network origin) |
| Rate limiting | `@nestjs/throttler` global guard; per-route overrides via `@Throttle` |
| Input validation | `ZodValidationPipe` with `@agendya/types` schemas, per route |
| Auth | `passport-jwt` (`JwtStrategy` re-loads the professional and checks `isActive`) |
| Config | `@nestjs/config` global, `config/configuration.ts` |
| Timezones | `common/utils/timezone.util.ts` (`date-fns-tz`) |
| Errors | Nest built-in `HttpException` subclasses → JSON `{ statusCode, message, error }` |

See [Backend architecture](/en/architecture/backend/) for the module internals and
[API architecture](/en/api/conventions/) for route conventions.
