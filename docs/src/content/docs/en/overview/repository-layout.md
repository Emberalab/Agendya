---
title: Repository layout
description: >-
  Directory-by-directory tour of the Agendya monorepo, including the folders
  that are intentionally not part of the running system.
---

npm **workspaces** monorepo. Node.js 24 (`.nvmrc`). Root scripts fan out across
all workspaces with `--workspaces --if-present`.

```
Agendya/
├── apps/
│   ├── api/                     NestJS backend (professional/customer)
│   │   ├── prisma.config.ts             points at ../../packages/db/prisma
│   │   ├── scripts/
│   │   │   ├── seed-services.mjs        optional demo services seeder
│   │   │   └── push-doctor.mjs          Web Push diagnostics
│   │   ├── src/
│   │   │   ├── main.ts / bootstrap.ts   entry + shared security wiring
│   │   │   ├── app.module.ts            root module
│   │   │   ├── config/configuration.ts  env → typed config
│   │   │   ├── common/                  pipes, decorators, utils (slug, timezone, cors)
│   │   │   ├── database/                PrismaService (global module)
│   │   │   ├── infra/
│   │   │   │   ├── mail/                MailService (Resend) + HTML escaping
│   │   │   │   └── upload/              Cloudinary image upload
│   │   │   └── modules/
│   │   │       ├── auth/                JWT + Google OAuth, guards, strategies
│   │   │       ├── professionals/       profile + public-by-slug
│   │   │       ├── services/            CRUD + plan limits
│   │   │       ├── schedules/           working hours, exceptions, availability
│   │   │       ├── bookings/            create/manage + reminder & expiration crons
│   │   │       └── support/             a professional views/creates THEIR OWN tickets (not Backoffice)
│   │   └── test/                        Jest e2e specs (*.e2e-spec.ts)
│   ├── web/                      React frontend (professional/customer)
│   │   ├── index.html                  pre-paint theme script, font <link>s
│   │   ├── vite.config.ts              react + tailwind plugins, manualChunks
│   │   ├── playwright.config.ts        Playwright e2e config
│   │   ├── src/
│   │   │   ├── main.tsx                 QueryClientProvider + StrictMode
│   │   │   ├── routes/                  AppRouter, PrivateRoute, PublicRoute
│   │   │   ├── shared/                  apiClient, theme store, a11y, UI atoms, image utils
│   │   │   └── modules/                 auth, dashboard, professionals, services,
│   │   │                                schedules, bookings, publicBooking, support
│   │   │       └── <module>/
│   │   │           ├── api.ts           thin fetch wrappers
│   │   │           ├── hooks/           useQuery / useMutation per operation
│   │   │           └── *.tsx            pages & components (+ *.test.tsx)
│   │   ├── tests/                       Playwright specs + API-stub fixtures
│   │   └── Agendya-main/       ⚠️ Figma Make export — NOT the live app (gitignored)
│   ├── backoffice-api/           NestJS backend for the Backoffice (internal staff)
│   │   │                                independent deploy from apps/api — same Postgres, own process
│   │   ├── prisma.config.ts             points at ../../packages/db/prisma (same schema as apps/api)
│   │   ├── scripts/seed-backoffice.mjs  provisions the first SUPER_ADMIN
│   │   ├── src/
│   │   │   ├── main.ts / bootstrap.ts   own copies — port :4001, CORS toward backoffice-web
│   │   │   └── modules/backoffice/      auth (JWT audience "agendya-backoffice"), tickets,
│   │   │                                internal-users, audit-log, professionals, appointments
│   │   └── test/                        backoffice.e2e-spec.ts
│   └── backoffice-web/           React frontend for the Backoffice
│       ├── vite.config.ts              react + tailwind only — no PWA, no Moon Design System
│       ├── playwright.config.ts
│       ├── src/
│       │   ├── routes/                  AppRouter (/backoffice/* paths), PrivateRoute, PublicRoute
│       │   ├── shared/                  minimal local copy of components/ (Badge, Button, Card, Input)
│       │   └── modules/backoffice/      auth, dashboard, tickets, professionals, appointments,
│       │                                auditLog, internalUsers, shared (permissions, backofficeApiClient)
│       └── tests/e2e/                   login-and-tickets.spec.ts
├── packages/
│   ├── types/                    @agendya/types — Zod schemas, built to dist/ on install
│   └── db/                       NOT an npm package — just prisma/schema.prisma + migrations/,
│                                  shared by apps/api and apps/backoffice-api (one source of truth)
├── infra/
│   └── docker-compose.yml        local Postgres on :5433  ← use this one
├── docker-compose.yml           ⚠️ stale duplicate at repo root — confirm before use
├── docs/                         this documentation site (Astro + Starlight)
├── .github/workflows/ci.yml      lint → typecheck → migrate → test → e2e (both APIs) → build
├── MVP-v1.md                     Phase 1 scope (read before larger features)
├── Fase-2/3/4-*.md               later phases — out of scope
├── Arquitectura-Tecnica.md       architecture background (prose)
├── Stack-Tecnologico.md          stack background (prose)
└── README.md                     setup walkthrough
```

## Why Backoffice is a separate deploy, not just a folder

Three options were weighed before this one: (1) reorganize into folders
within the same `apps/api`/`apps/web` processes — rejected, a crash in one
still takes the other down, buying zero real availability; (2) a fully
separate git repository — rejected for now, it adds cross-repo coordination
the team doesn't need yet; (3) a fully independent service reading the main
API over HTTP instead of Postgres directly — rejected as premature
hexagonal-style decoupling for a single-provider, MVP-stage stack. What's
implemented is the middle ground: separate process/deploy (the actual
availability win), same repository, same database via one shared
`schema.prisma`.

## Folders that are not the running system

:::caution[`apps/web/Agendya-main/`]
A self-contained **Figma Make** design export with its own `package.json` and
its own generic `CLAUDE.md`/`AGENTS.md`. It is excluded from git
(`apps/web/.gitignore` → `/Agendya-main`). Only pull from it when deliberately
porting a specific screen into `apps/web/src`. Edits inside it do **not** affect
the running app.
:::

:::caution[Root `docker-compose.yml`]
A stale duplicate of `infra/docker-compose.yml` with different container
naming. The README setup flow and CLAUDE.md both point at
`infra/docker-compose.yml` — use that one.
:::

## Duplicated `… 2` files

A few files exist twice with a ` 2` suffix (`apps/api/src/bootstrap 2.ts`,
`CLAUDE 2.md`, `apps/api/test/security.e2e-spec 2.ts`). These are editor/sync
artifacts; `.gitignore` even lists `node_modules 2`. The un-suffixed file is
the real one.
