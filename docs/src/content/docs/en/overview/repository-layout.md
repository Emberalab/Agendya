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
│   ├── api/                     NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma            domain model
│   │   │   ├── migrations/              12 SQL migrations (as of Phase 1)
│   │   │   └── seed-services.mjs        optional demo services seeder
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
│   │   │       └── bookings/            create/manage + reminder & expiration crons
│   │   └── test/                        Jest e2e specs (*.e2e-spec.ts)
│   └── web/                      React frontend
│       ├── index.html                  pre-paint theme script, font <link>s
│       ├── vite.config.ts              react + tailwind plugins, manualChunks
│       ├── playwright.config.ts        Playwright e2e config
│       ├── src/
│       │   ├── main.tsx                 QueryClientProvider + StrictMode
│       │   ├── routes/                  AppRouter, PrivateRoute, PublicRoute
│       │   ├── shared/                  apiClient, theme store, a11y, UI atoms, image utils
│       │   └── modules/                 auth, dashboard, professionals, services,
│       │                                schedules, bookings, publicBooking
│       │       └── <module>/
│       │           ├── api.ts           thin fetch wrappers
│       │           ├── hooks/           useQuery / useMutation per operation
│       │           └── *.tsx            pages & components (+ *.test.tsx)
│       ├── tests/                       Playwright specs + API-stub fixtures
│       └── Agendya-main/       ⚠️ Figma Make export — NOT the live app (gitignored)
├── packages/
│   └── types/                    @agendya/types — Zod schemas, built to dist/ on install
├── infra/
│   └── docker-compose.yml        local Postgres on :5433  ← use this one
├── docker-compose.yml           ⚠️ stale duplicate at repo root — confirm before use
├── docs/                         this documentation site (Astro + Starlight)
├── .github/workflows/ci.yml      lint → typecheck → migrate → test → e2e → build
├── MVP-v1.md                     Phase 1 scope (read before larger features)
├── Fase-2/3/4-*.md               later phases — out of scope
├── Arquitectura-Tecnica.md       architecture background (prose)
├── Stack-Tecnologico.md          stack background (prose)
└── README.md                     setup walkthrough
```

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
