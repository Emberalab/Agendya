# Agendya

Monorepo with an API ([apps/api](apps/api), NestJS + Prisma) and a web app ([apps/web](apps/web), React + Vite), managed as npm workspaces.

## Documentation

Full engineering documentation (architecture, data model, API reference, feature
walkthroughs, testing, security, deployment, contribution guides) lives in
[`docs/`](docs) as an Astro + Starlight site. It is **bilingual** — Spanish at
`/` (default) and English at `/en/`, switchable from the header.

```bash
npm run docs          # dev server at http://localhost:4321
npm run docs:build    # production build
```

See [docs/README.md](docs/README.md) for how to write and deploy it.

## Prerequisites

- Node.js 24 (see [.nvmrc](.nvmrc) — run `nvm use` if you use nvm)
- Docker Desktop (for the local Postgres database)

## Setup

1. **Install dependencies** from the repo root:

   ```bash
   npm install
   ```

   This installs all workspaces and runs `postinstall`, which builds `packages/types` and generates the Prisma client for `apps/api`.

2. **Set up environment variables**:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   - `apps/api/.env.example` has working defaults for local development (matches the Docker Postgres credentials below). Ask a teammate for real values of `RESEND_API_KEY` / `CLOUDINARY_URL` if you need those integrations working locally — share them through a secure channel (password manager), not plain text.
   - `apps/web/.env` usually doesn't need any changes — `VITE_API_URL` auto-detects the API host. Only set it to point at a different backend (e.g. staging).

3. **Start Postgres**:

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

4. **Apply database migrations** (first time, or after pulling new migrations):

   ```bash
   cd apps/api && npx prisma migrate deploy && cd ../..
   ```

5. **Run the API**:

   ```bash
   npm run dev:api
   ```

6. **Run the web app** (in another terminal):

   ```bash
   npm run dev:web
   ```

The web app runs at `http://localhost:5173` and the API at `http://localhost:4000` by default.

## Other useful scripts

- `npm run build` — build all workspaces
- `npm run lint` — lint all workspaces
- `npm run test` — run tests in all workspaces
- `npm run typecheck` — typecheck all workspaces
- `npm run dev:web:host` — run the web app exposed on the LAN (useful for testing from another device)
