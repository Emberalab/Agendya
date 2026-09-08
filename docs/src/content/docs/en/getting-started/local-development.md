---
title: Local development
description: Day-to-day commands for working on the API, the web app, and the shared types.
---

## Root scripts (`package.json`)

| Command | What it does |
| --- | --- |
| `npm run dev:api` | `start:dev` in `apps/api` — NestJS watch mode on `:4000` |
| `npm run dev:web` | `vite` in `apps/web` on `:5173` |
| `npm run dev:web:host` | Vite exposed on the LAN (`--host`) for testing from a phone/another device |
| `npm run build` | `build` in every workspace |
| `npm run lint` | `lint` in every workspace (ESLint for `apps/api`, oxlint for `apps/web`) |
| `npm run test` | `test` in every workspace (Jest unit / Vitest) |
| `npm run typecheck` | `typecheck` in every workspace |
| `npm run format` / `format:check` | Prettier over the repo (excludes `apps/api` and all `*.md`) |

## API-only (`cd apps/api`)

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Watch-mode server |
| `npm run test` | Jest unit specs (`src/**/*.spec.ts`) |
| `npm run test:e2e` | Jest e2e specs (`test/**/*.e2e-spec.ts`, `--runInBand`) — needs Postgres |
| `npm run lint` | ESLint `--fix` |
| `npx prisma migrate dev --name <desc>` | Create + apply a new migration |
| `npx prisma studio` | Browse the database in a GUI |
| `npx prisma generate` | Regenerate the client after a schema edit |

## Web-only (`cd apps/web`)

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run test` | Vitest (run mode) |
| `npm run typecheck` | `tsc -b --noEmit` + `tsc -p tsconfig.e2e.json` |
| `npm run lint` | oxlint |
| `npm run test:e2e` | Playwright (starts/reuses the Vite dev server, stubs the API) |
| `npm run test:e2e:ui` / `:headed` / `:report` | Playwright UI / headed / open last report |
| `npm run test:e2e:install` | One-off: download the Chromium build |

## Typical loops

```mermaid
flowchart LR
  subgraph "Change a payload shape"
    T1["Edit packages/types<br/>schema + type"] --> T2["npm run build -w packages/types<br/>(or run its dev --watch)"]
    T2 --> T3["Update apps/api<br/>controller + service"]
    T3 --> T4["Update apps/web<br/>api.ts + hook + form"]
    T4 --> T5["npm run typecheck"]
  end
```

```mermaid
flowchart LR
  subgraph "Change the DB schema"
    D1["Edit prisma/schema.prisma"] --> D2["npx prisma migrate dev --name x<br/>(applies + regenerates client)"]
    D2 --> D3["Adjust service/controller code"]
    D3 --> D4["npm run test  ·  npm run test:e2e"]
  end
```

:::tip[Watch the shared package]
Run `npm run dev --workspace packages/types` (`tsc --watch`) in a spare
terminal while touching `@agendya/types` so both apps pick up changes without a
manual rebuild.
:::

## Editing this documentation

```bash
cd docs
npm install        # first time only
npm run dev        # Starlight dev server on http://localhost:4321
npm run build      # production build into docs/dist/
```

Pages are Markdown/MDX under `docs/src/content/docs/`. The sidebar is defined
in `docs/astro.config.mjs`. See the [Development guide](/en/development-guide/) for
the "add a docs page" checklist.
