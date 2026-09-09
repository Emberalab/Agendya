---
title: Installation
description: Clone, install, configure, and boot both apps from a clean checkout.
---

The canonical walkthrough lives in the repo `README.md`. This page is the same
flow with more context.

1. **Clone and select Node 24**

   ```bash
   git clone https://github.com/Emberalab/Agendya.git
   cd Agendya
   nvm use            # or: nvm install
   ```

2. **Install all workspaces**

   ```bash
   npm install
   ```

   `postinstall` at the repo root runs `npm run build --workspace packages/types`
   (compiles `@agendya/types` to `dist/`), and `apps/api`'s own `postinstall`
   runs `prisma generate` (creates the typed Prisma client).

3. **Create the env files**

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   `apps/api/.env.example` ships working local defaults (matching the Docker
   Postgres credentials). `apps/web/.env` normally needs no changes —
   `VITE_API_URL` auto-detects. See
   [Environment variables](/en/getting-started/environment/).

4. **Start PostgreSQL**

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

   Container `agendya-postgres`, database `agendya_dev`, exposed on host port
   `5433`.

5. **Apply database migrations**

   ```bash
   cd apps/api && npx prisma migrate deploy && cd ../..
   ```

   Run this again after any `git pull` that adds migrations.

6. **Run the API** (terminal 1)

   ```bash
   npm run dev:api        # NestJS on http://localhost:4000
   ```

7. **Run the web app** (terminal 2)

   ```bash
   npm run dev:web        # Vite on http://localhost:5173
   ```

## Verify

| Check | Expected |
| --- | --- |
| `curl http://localhost:4000` | `Agendya API` |
| `curl http://localhost:4000/health` | `{"status":"ok","timestamp":"…"}` |
| Open `http://localhost:5173` | Redirects to `/login` |
| Register at `/register`, then visit `/dashboard/profile` | Your new professional profile loads |

## Optional — seed demo services

```bash
node apps/api/prisma/seed-services.mjs
```

Populates a set of example services for an existing professional. Inspect the
script for the account it targets.

## Common first-run issues

See [Troubleshooting](/en/troubleshooting/). The usual suspects: Docker not
running, port `5433`/`4000`/`5173` already in use, or migrations not applied
(`prisma migrate deploy`).
