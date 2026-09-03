# CLAUDE.md

Guidance for Claude when working in this repository.

## Project overview

Agendya is a web scheduling platform. Phase 1 (current, MVP as of September 2026) targets barbers and hairstylists: a professional gets a public booking page, manages services and working hours, and customers book appointments online.

Root-level planning docs (hand-authored prose, not code) describe product scope and are worth reading before larger feature work:
- `MVP-v1.md` — current Phase 1 scope
- `Fase-2-Retencion.md`, `Fase-3-Marketplace.md`, `Fase-4-Negocios-WhatsApp.md` — later phases, intentionally out of scope for now
- `Arquitectura-Tecnica.md`, `Stack-Tecnologico.md`, `Plataforma-Reservas-Servicios.md` — architecture/stack background

## Structure

npm workspaces monorepo:
- `apps/api` — NestJS backend (Prisma + PostgreSQL)
- `apps/web` — React + Vite frontend
- `packages/types` (`@agendya/types`) — shared Zod schemas/TS types consumed by both apps
- `infra/docker-compose.yml` — local Postgres container used by the README setup flow (this is the one to use; a duplicate `docker-compose.yml` also sits at the repo root with different container naming — treat it as stale and confirm before relying on it)

## `apps/web/Agendya-main` is NOT the live app

That folder is a self-contained Figma Make export kept for design reference (it has its own `package.json`, and its own `CLAUDE.md`/`AGENTS.md` pointing to a generic "figma-make-app" scaffold — unrelated to this project's real setup). It's excluded from git via `apps/web/.gitignore` (`/Agendya-main`). The real, live frontend source is `apps/web/src/**`. Only pull from `Agendya-main` when deliberately porting a specific screen/component into `apps/web/src`; don't treat edits inside it as affecting the running app.

## Naming note: "ronda" vs "agendya"

The product appears to have been renamed from "Ronda" to "Agendya". Some infra/config still uses the old name: `infra/docker-compose.yml` container and DB credentials, the CI Postgres service credentials, and a comment in `apps/api/prisma/schema.prisma` referencing a local plan file path on the original author's machine (not portable — ignore that path if it doesn't exist). These are just leftover names, not a separate product.

## Tech stack

**API** (`apps/api`): NestJS 11, Prisma 7 + PostgreSQL, Zod validation (`common/pipes/zod-validation.pipe.ts`), JWT auth (`@nestjs/jwt` + `passport-jwt`) plus Google OAuth (`passport-google-oauth20`), `@nestjs/schedule` for the booking reminder cron (`modules/bookings/reminders.scheduler.ts`), `@nestjs/throttler` for rate limiting, Resend for transactional email, Cloudinary for image uploads (logos/covers), bcrypt for password hashing.

**Web** (`apps/web`): React 19 + Vite + TypeScript, React Router 7, TanStack Query for server state, React Hook Form + Zod resolvers for forms, Zustand for client state, Tailwind CSS v4, Moon Design System (`@moondesignsystem/react` / `/ui`) for UI components, axios for HTTP, date-fns for dates, Vitest + Testing Library + MSW for tests, oxlint for linting.

**Shared**: `packages/types` holds the Zod schemas (booking, service, schedule, professional, auth) used by both apps. When a data shape changes, update it there first, then adjust both consumers.

## Domain model (`apps/api/prisma/schema.prisma`)

- **Professional** — the barber/stylist account: `slug` (public booking URL), `timezone` (default `America/Bogota`), `cancellationPolicyHours`, `plan` (BASIC/PRO), branding fields (logo/cover/brandColor), Google OAuth or password login.
- **Service** — an offering: `durationMinutes`, `priceCents`, optional home-service variant (`homeServiceEnabled`/`homeDurationMinutes`/`homePriceCents`), soft-deleted via `deletedAt`.
- **WorkingHour** — weekly recurring availability per professional (`dayOfWeek` + `startMinute`/`endMinute`).
- **ScheduleException** — one-off closed dates per professional.
- **Booking** — a customer appointment: snapshots the service name/duration at booking time, `status` (PENDING/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW), `cancellationToken` for public cancel links, `reminder24hSentAt`/`reminder2hSentAt` for the reminder scheduler, optional `atHome` + `customerAddress`.
- Slot calculation is grid-based: the `SLOT_GRID_MINUTES` env var (default 15) sets booking slot granularity — see `apps/api/src/modules/schedules/availability.service.ts`.

## Setup & commands

Full walkthrough in `README.md`; summary:

```bash
npm install                                              # installs all workspaces, builds packages/types, generates Prisma client
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose -f infra/docker-compose.yml up -d         # local Postgres on :5433
cd apps/api && npx prisma migrate deploy && cd ../..      # apply migrations
npm run dev:api                                           # API on :4000
npm run dev:web                                           # web on :5173
```

Cross-workspace: `npm run build` / `lint` / `test` / `typecheck` (each runs across all workspaces). API-only: `npm run test:e2e --workspace apps/api`, or from `apps/api`: `npx prisma migrate dev --name <desc>`, `npx prisma studio`.

## Conventions

- **Formatting**: root Prettier config (`singleQuote`, `trailingComma: all`) covers `apps/web` and `packages/types`; `apps/api` has its own `.prettierrc`/format script and is excluded from the root Prettier run. Markdown files are excluded from Prettier entirely (hand-authored prose).
- **Linting**: `apps/api` uses ESLint; `apps/web` uses oxlint.
- **Env files**: `.env` exists locally for both apps and is gitignored — never commit it; keep `.env.example` in sync when adding config.
- **Tests**: `apps/api` uses Jest (`*.spec.ts` colocated with source, e2e specs in `apps/api/test/*.e2e-spec.ts`); `apps/web` uses Vitest + Testing Library + MSW (`*.test.tsx`).
- **CI** (`.github/workflows/ci.yml`, push/PR to `main`): lint → typecheck → `prisma migrate deploy` → unit tests → `apps/api` e2e tests → build, against a Postgres 16 service container.

## Working in this repo

- Changing a shared data shape: update `packages/types` first, then `apps/api` and `apps/web`.
- Schema changes need a migration: `cd apps/api && npx prisma migrate dev --name <description>`.
- This is Phase 1 (MVP) — check `MVP-v1.md` before adding functionality that belongs to a later phase (`Fase-2/3/4-*.md`).
