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
- `apps/api` — NestJS backend (Prisma + PostgreSQL), the professional/customer-facing platform: booking, services, schedules, billing, notifications.
- `apps/web` — React + Vite frontend for the same, professional-facing.
- `apps/backoffice-api` — NestJS backend for internal staff ops/support (tickets, audit log, internal user management). **Deployed independently of `apps/api`** — separate process, separate port (`4001` locally), separate JWT secret/audience — precisely so an outage or bad deploy of one doesn't take the other down. It shares apps/api's Postgres database directly via Prisma (real FKs from `SupportTicket`/`AuditLog` into `Professional`/`Booking`); the two are not independent at the database layer, only at the process/deploy layer. See `packages/db` below.
- `apps/backoffice-web` — React + Vite frontend for the above, entirely separate SPA (own `index.html`/port `5174` locally), not a route inside `apps/web`.
- `packages/types` (`@agendya/types`) — shared Zod schemas/TS types consumed by all four apps.
- `packages/db` — **not an npm package**, just the one shared `prisma/schema.prisma` + `prisma/migrations/` both `apps/api` and `apps/backoffice-api` point their own `prisma.config.ts` at (relative `schema`/`migrations.path`). One source of truth for the DB shape; run `prisma migrate dev`/`generate` from either app, they resolve to the same files. Each app still has its own generated `@prisma/client` wiring (`src/database/prisma.service.ts`) — that part is intentionally duplicated (~15 lines), not shared, to keep each app's Nest DI self-contained.
- `infra/docker-compose.yml` — local Postgres container used by the README setup flow (this is the one to use; a duplicate `docker-compose.yml` also sits at the repo root with different container naming — treat it as stale and confirm before relying on it)
- `docs/` — engineering documentation site (Astro + Starlight + Mermaid). **Not** an npm workspace (own `package.json`/lockfile) so its toolchain stays isolated. **Bilingual** via Starlight i18n: Spanish is the default locale (`docs/src/content/docs/**`, served at `/`), English lives in `docs/src/content/docs/en/**` (served at `/en/`) — every page is mirrored in both, and a new page must be added to both trees plus the single `sidebar` in `docs/astro.config.mjs` (Spanish `label` + `translations: { en }`). Spanish pages use `/…` internal links, English pages use `/en/…`. Run with `npm run docs` (or `docs:build`). Deployed to GitHub Pages by `.github/workflows/docs.yml`. Keep both languages in sync when changing architecture, the schema, API routes, or env config; mark genuinely unclear behaviour as `TODO` rather than inventing it. See `docs/README.md`.

### Why Backoffice is a separate deploy, not just a separate folder

Three earlier, real options were considered: (1) reorganize as folders within the same `apps/api`/`apps/web` processes — rejected, since a crash in one still takes the other down, buying zero availability; (2) a fully separate git repository — rejected for now, adds cross-repo coordination cost the team doesn't need yet; (3) a fully independent service reading the main API over HTTP instead of Postgres directly — rejected as premature hexagonal-style decoupling for a single-provider MVP-stage stack; revisit only if the databases themselves are ever split. What's implemented is the middle ground: separate process/deploy (the actual availability win), same repo, same database via a shared Prisma schema.

## `apps/web/Agendya-main` is NOT the live app

That folder is a self-contained Figma Make export kept for design reference (it has its own `package.json`, and its own `CLAUDE.md`/`AGENTS.md` pointing to a generic "figma-make-app" scaffold — unrelated to this project's real setup). It's excluded from git via `apps/web/.gitignore` (`/Agendya-main`). The real, live frontend source is `apps/web/src/**`. Only pull from `Agendya-main` when deliberately porting a specific screen/component into `apps/web/src`; don't treat edits inside it as affecting the running app.

## Naming note: "ronda" vs "agendya"

The product was renamed from "Ronda" to "Agendya" early on. Infra/config, CI, and app-visible identifiers (local Postgres credentials, the `agendya-auth`/`agendya-theme` localStorage keys, the API's root health-check string, Cloudinary upload folders, Prisma schema header) have all been updated to "Agendya" — a leftover `Ronda`/`ronda.test` reference outside the hand-authored planning docs (`Arquitectura-Tecnica.md`, `Stack-Tecnologico.md`, `MVP-v1.md`, `Fase-4-Negocios-WhatsApp.md` — old product-name mentions there are historical prose, not live config, and are intentionally left as-is) is a regression worth fixing. `packages/db/prisma/schema.prisma`'s second line still references a local plan file path on the original author's machine — not portable, ignore it if it doesn't exist.

## Tech stack

**API** (`apps/api`): NestJS 11, Prisma 7 + PostgreSQL, Zod validation (`common/pipes/zod-validation.pipe.ts`), JWT auth (`@nestjs/jwt` + `passport-jwt`) plus Google OAuth (`passport-google-oauth20`), `@nestjs/schedule` for the booking reminder cron (`modules/bookings/reminders.scheduler.ts`), `@nestjs/throttler` for rate limiting, Resend for transactional email, Cloudinary for image uploads (logos/covers), `web-push` (VAPID) for PWA push notifications to the professional (`modules/notifications/push-subscriptions.service.ts`), bcrypt for password hashing.

**Web** (`apps/web`): React 19 + Vite + TypeScript, React Router 7, TanStack Query for server state, React Hook Form + Zod resolvers for forms, Zustand for client state, Tailwind CSS v4, Moon Design System (`@moondesignsystem/react` / `/ui`) for UI components, axios for HTTP, date-fns for dates, `vite-plugin-pwa` (`injectManifest` strategy, custom service worker at `src/sw.ts` for offline shell + Web Push), Vitest + Testing Library + MSW for tests, oxlint for linting.

**Backoffice API** (`apps/backoffice-api`): NestJS 11, same Prisma/Zod/JWT/throttler stack as `apps/api` (bootstrap/CORS/config code is a deliberate small duplicate, not shared — see Structure above), no Google OAuth/Resend/Cloudinary/web-push/`@nestjs/schedule` (unneeded here). Its own passport strategy (`internal-jwt`, audience `agendya-backoffice`) keeps a `Professional` token and an `InternalUser` token from ever authenticating each other's routes.

**Backoffice Web** (`apps/backoffice-web`): React 19 + Vite + TypeScript, React Router 7, TanStack Query, Zustand — deliberately lighter than `apps/web` (no Moon Design System, no PWA/service worker, no React Hook Form), but shares its visual identity: `src/styles/tailwind.css` duplicates apps/web's `--color-*`/`--font-*`/`--radius-control` token values (own file, no shared CSS package — see "Why Backoffice is a separate deploy" above) and its own `shared/theme/themeStore.ts`/`ThemeToggle.tsx` apply the same `data-theme` light/dark mechanism, own storage key (`agendya-backoffice-theme`).

**Shared**: `packages/types` holds the Zod schemas (booking, service, schedule, professional, auth, ticket, internal-user, audit-log) used across all four apps. When a data shape changes, update it there first, then adjust every consumer.

## Domain model (`packages/db/prisma/schema.prisma`)

- **Professional** — the barber/stylist account: `slug` (public booking URL), `timezone` (default `America/Bogota`), `cancellationPolicyHours`, `plan` (FREE/BASIC/ADVANCED/BUSINESS), branding fields (logo/cover/brandColor), Google OAuth or password login.
- **Service** — an offering: `durationMinutes`, `priceCents`, optional home-service variant (`homeServiceEnabled`/`homeDurationMinutes`/`homePriceCents`), soft-deleted via `deletedAt`.
- **WorkingHour** — weekly recurring availability per professional (`dayOfWeek` + `startMinute`/`endMinute`).
- **ScheduleException** — one-off closed dates per professional.
- **Booking** — a customer appointment: snapshots the service name/duration at booking time, `status` (PENDING/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW), `cancellationToken` for public cancel links, `reminder24hSentAt`/`reminder2hSentAt` for the reminder scheduler, optional `atHome` + `customerAddress`.
- **Notification** — the professional's persistent in-app feed row; source of truth for SSE + Web Push delivery.
- **PushSubscription** — one browser Web Push subscription per professional device (`endpoint` globally unique); fanned out from `NotificationsService.create()`.
- **InternalUser** — a Backoffice staff account (`role`: READ_ONLY/SUPPORT/ADMIN/SUPER_ADMIN), entirely separate identity from `Professional` — see `apps/backoffice-api`.
- **SupportTicket** / **SupportMessage** — a professional's support ticket and its conversation thread. A message's author is exactly one of `authorInternalUserId` (staff) or `authorProfessionalId` (the professional replying via `apps/api`'s `modules/support`) — never both. `visibility: INTERNAL_NOTE` messages must never reach a professional-facing endpoint.
- **AuditLog** — append-only record of every Backoffice mutation and profile view (`AuditLogService.record()`; no update/delete path exists).
- Slot calculation is grid-based: the `SLOT_GRID_MINUTES` env var (default 15) sets booking slot granularity — see `apps/api/src/modules/schedules/availability.service.ts`.

## Setup & commands

Full walkthrough in `README.md`; summary:

```bash
npm install                                              # installs all workspaces, builds packages/types, generates Prisma client
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/backoffice-api/.env.example apps/backoffice-api/.env
cp apps/backoffice-web/.env.example apps/backoffice-web/.env
docker compose -f infra/docker-compose.yml up -d         # local Postgres on :5433
cd apps/api && npx prisma migrate deploy && cd ../..      # apply migrations (packages/db/prisma — either app's prisma.config.ts resolves the same files)
npm run dev:api                                           # apps/api on :4000
npm run dev:web                                           # apps/web on :5173
npm run dev:backoffice-api                                # apps/backoffice-api on :4001
npm run dev:backoffice-web                                # apps/backoffice-web on :5174
```

First Backoffice `SUPER_ADMIN`: `cd apps/backoffice-api && npm run seed:backoffice -- <email> "<name>" <password>` — there is no self-registration by design.

Cross-workspace: `npm run build` / `lint` / `test` / `typecheck` (each runs across all four apps + `packages/types`), or `npm run verify` to chain lint → typecheck → test → build in one shot (fail-fast; run before committing). API-only e2e: `npm run test:e2e --workspace apps/api` / `--workspace apps/backoffice-api`. Schema commands work from either `apps/api` or `apps/backoffice-api` (`prisma.config.ts` in both points at `packages/db/prisma`): `npx prisma migrate dev --name <desc>`, `npx prisma studio`.

## Conventions

- **Formatting**: root Prettier config (`singleQuote`, `trailingComma: all`) covers `apps/web`, `apps/backoffice-web`, and `packages/types`; `apps/api`/`apps/backoffice-api` each have their own `.prettierrc`/format script and are excluded from the root Prettier run. Markdown files are excluded from Prettier entirely (hand-authored prose).
- **Linting**: `apps/api`/`apps/backoffice-api` use ESLint; `apps/web`/`apps/backoffice-web` use oxlint.
- **Env files**: `.env` exists locally for all four apps and is gitignored — never commit it; keep each app's `.env.example` in sync when adding config. `apps/backoffice-api`'s `JWT_SECRET` is deliberately its own value, distinct from `apps/api`'s.
- **Tests**: the two API apps use Jest (`*.spec.ts` colocated with source, e2e specs in `<app>/test/*.e2e-spec.ts`); the two web apps use Vitest (+ Testing Library/MSW in `apps/web`) for `*.test.tsx`/`*.test.ts`, and Playwright for `tests/e2e/**`.
- **CI** (`.github/workflows/ci.yml`, push/PR to `main`): lint → typecheck → `prisma migrate deploy` (against `packages/db/prisma`) → unit tests → e2e tests for both API apps → build, against a Postgres 16 service container shared by `apps/api` and `apps/backoffice-api`.

## Working in this repo

- Changing a shared data shape: update `packages/types` first, then every app that consumes it (`apps/api`/`apps/web` and, for ticket/internal-user/audit-log shapes, `apps/backoffice-api`/`apps/backoffice-web`).
- Schema changes need a migration: `cd apps/api && npx prisma migrate dev --name <description>` (equivalently from `apps/backoffice-api` — both resolve to `packages/db/prisma`, one shared migration history).
- Backoffice-specific backend code lives in `apps/backoffice-api/src/modules/backoffice/`, not `apps/api` — don't add new internal-staff routes to `apps/api`. A professional's own support-ticket self-service (create/reply on their own tickets) is `apps/api/src/modules/support/` instead — professional-facing, `JwtAuthGuard`, not part of the Backoffice.
- This is Phase 1 (MVP) — check `MVP-v1.md` before adding functionality that belongs to a later phase (`Fase-2/3/4-*.md`).
