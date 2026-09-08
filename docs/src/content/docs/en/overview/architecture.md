---
title: High-level architecture
description: >-
  The moving parts of Agendya and how a request travels from the browser to
  PostgreSQL and back.
---

Agendya is a **two-app monorepo** plus a shared contract package:

```mermaid
flowchart TB
  subgraph Browser
    Web["apps/web<br/>React 19 + Vite<br/>React Router · TanStack Query · Zustand"]
  end

  subgraph Server["Node.js 24"]
    API["apps/api<br/>NestJS 11<br/>Auth · Professionals · Services · Schedules · Bookings · Upload"]
    Cron["@nestjs/schedule crons<br/>RemindersScheduler · ExpirationScheduler"]
  end

  DB[("PostgreSQL 16<br/>via Prisma 7 + @prisma/adapter-pg")]

  Google["Google OAuth 2.0"]
  Resend["Resend<br/>transactional email"]
  Cloudinary["Cloudinary<br/>logo / cover uploads"]

  Web -- "REST / JSON over HTTPS<br/>JWT in Authorization header" --> API
  API --> DB
  Cron --> DB
  API -- "OAuth redirect flow" --> Google
  API -- "emails" --> Resend
  API -- "image upload" --> Cloudinary
  Web -. "loads derived image URLs<br/>(f_auto,q_auto)" .-> Cloudinary

  Shared["packages/types<br/>@agendya/types — Zod schemas"]
  Shared -. "compile-time contract" .-> Web
  Shared -. "compile-time contract + runtime validation" .-> API
```

## Request path

Every mutating request follows the same layered path:

```
User → React component
     → module hook (TanStack Query / RHF)
     → module api.ts (apiClient: fetch + JWT)
     → NestJS Controller  (route, ZodValidationPipe, guards)
     → NestJS Service     (business rules, policy checks)
     → PrismaService      (typed queries, transactions)
     → PostgreSQL
```

See [Data flow](/en/architecture/data-flow/) for a worked example (creating a
booking) and [Backend architecture](/en/architecture/backend/) for the module
breakdown.

## Repositories & workspaces

| Workspace | Package name | Stack | Purpose |
| --- | --- | --- | --- |
| `apps/api` | `api` | NestJS 11, Prisma 7, PostgreSQL | REST API, auth, cron jobs |
| `apps/web` | `web` | React 19, Vite, TS | Professional dashboard + public booking |
| `packages/types` | `@agendya/types` | Zod | Shared request/response schemas & constants |

`apps/web/Agendya-main/` is a **Figma Make design export** kept for reference
only. It is gitignored and is not the running app — see
[Repository layout](/en/overview/repository-layout/).

## Key characteristics

- **Stateless API auth.** The JWT travels in the `Authorization` header, never
  a cookie, so CORS `credentials` stays `false`. (The one cookie in the system
  is the short-lived OAuth `state` cookie for login-CSRF protection.)
- **Contract-first.** A payload shape changes in `packages/types` first, then
  both consumers. The API re-validates every body/query with the same Zod
  schema at runtime via `ZodValidationPipe`.
- **Timezone-correct.** Each professional has an IANA `timezone`. Wall-clock
  interpretation (working hours, "today") goes through
  `common/utils/timezone.util.ts`; absolute instants (`startAt`) are compared
  directly.
- **Concurrency-safe booking writes.** Slot commits and reschedules run in
  `Serializable` transactions with a bounded retry on serialization failure.
- **Graceful third-party degradation.** No `RESEND_API_KEY` → emails log to
  console. No `CLOUDINARY_URL` → upload endpoint returns 503. No Google
  credentials → the OAuth strategy simply isn't registered.
