---
title: Troubleshooting
description: Common local-development problems and their fixes.
---

## Setup & install

| Symptom | Cause | Fix |
| --- | --- | --- |
| `npm install` fails on `@agendya/types` import | `postinstall` didn't build the package | `npm run build -w packages/types`, then reinstall |
| `Cannot find module '@prisma/client'` / types missing | Prisma client not generated | `cd apps/api && npx prisma generate` |
| Engine / Node version error | Not on Node 24 | `nvm use` (or `nvm install`) — `.nvmrc` says `24` |
| `tsc` errors only in `apps/web` about `@agendya/types` | stale `packages/types/dist` | rebuild types; run its `dev --watch` while developing |

## Database

| Symptom | Cause | Fix |
| --- | --- | --- |
| API won't start, `ECONNREFUSED ...:5433` | Postgres container not running | `docker compose -f infra/docker-compose.yml up -d` |
| `password authentication failed` | `DATABASE_URL` doesn't match the container | Re-copy `apps/api/.env.example`; user/pass/db = `agendya` / `agendya_dev_password` / `agendya_dev`, port `5433` |
| `P3005 database schema is not empty` / drift | Manual schema changes, or a wrong compose file | `npx prisma migrate reset` (dev only — wipes data) |
| Tables missing after clone | Migrations never applied | `cd apps/api && npx prisma migrate deploy` |
| Weird container naming / stale data | Used the root `docker-compose.yml` | Use `infra/docker-compose.yml`; `docker compose -f infra/docker-compose.yml down -v` to reset |
| e2e specs hang or flake | Cron jobs racing serializable transactions | Ensure `DISABLE_SCHEDULED_JOBS=true` is set for the e2e run |

## Auth & OAuth

| Symptom | Cause | Fix |
| --- | --- | --- |
| Warning: *"JWT_SECRET is set to the placeholder value"* | `JWT_SECRET` still `dev-secret-change-in-production` | Fine locally; set a strong unique value anywhere real |
| `401` on every authenticated call | Expired/absent token, or account `isActive=false` | Log in again; check the `Professional` row |
| Login returns *"Esta cuenta usa autenticación con Google"* | Account has no `passwordHash` | Use "Sign in with Google" |
| `GET /auth/google` → 404 / route missing | Google not configured | Set `GOOGLE_CLIENT_ID` **and** `GOOGLE_CLIENT_SECRET`; the strategy is only registered when both exist |
| OAuth callback → JSON `403` or you land on `localhost:4000` | `state` cookie missing/expired or mismatched (Chrome can drop cookies on a `:4000` → Google → `:4000` bounce) | Restart from the in-app Google button (`/login`); don't reload or bookmark the callback URL. After the fix this redirects to `/login?error=oauth` |
| Logged out immediately after Google login | `GoogleCallbackPage` couldn't reach `/auth/me` | Check `VITE_API_URL` / API is up; token still set, `businessName` just missing |
| `/forgot-password` does nothing | **No reset endpoint exists** | Known gap — see [Security](/en/security/#known-gaps--todo) |

## CORS

| Symptom | Cause | Fix |
| --- | --- | --- |
| Browser: *"blocked by CORS policy"* | Frontend origin ≠ `WEB_URL` / `PUBLIC_WEB_URL` and not a private/localhost IP | Set `WEB_URL` (dashboard) and `PUBLIC_WEB_URL` (apex) to the exact origins; for LAN testing use `npm run dev:web:host` (private IPs are allowed automatically) |
| API calls go to the wrong host | `VITE_API_URL` unset and page opened from an odd host | Set `VITE_API_URL` explicitly, or open the app from `localhost` / the LAN IP the API is also on |

## Build & test

| Symptom | Cause | Fix |
| --- | --- | --- |
| `vite build` fails in `tsc -b` | Type error, often stale `@agendya/types` | Rebuild types; `npm run typecheck` for the real error |
| Playwright: *"browserType.launch: Executable doesn't exist"* | Chromium not downloaded | `npm run test:e2e:install --workspace apps/web` |
| Playwright: port 5173 in use / `webServer` timeout | Dev server already running / stuck | Stop the other Vite process, or set `E2E_PORT` |
| Vitest picks up Playwright specs | — | Already excluded (`vite.config.ts` `exclude: ['tests/**']`); don't put `*.test.tsx` under `tests/` |
| oxlint vs ESLint confusion | Wrong linter for the workspace | `apps/web` = oxlint, `apps/api` = ESLint; run `npm run lint` at the root to do both |

## Bookings behave unexpectedly

| Symptom | Explanation |
| --- | --- |
| A slot shown in the wizard fails with `409` on submit | Someone booked it first; availability is advisory, the serializable overlap guard is authoritative |
| Can't cancel/reschedule close to the appointment | `cancellationPolicyHours` window (default 24h) — `403` by design |
| A past confirmed booking now shows *"Vencida"* | `ExpirationScheduler` (every 15 min) or a lazy self-heal flipped `CONFIRMED → EXPIRED` |
| Reminder emails not arriving locally | No `RESEND_API_KEY` → they're logged: look for `[dev] Email a …` in the API console |
| Cancelled/completed bookings still take slots? | They don't — only `CONFIRMED` counts as busy in availability |

## Docs site

| Symptom | Fix |
| --- | --- |
| `npm run dev` in `docs/` fails: content collection error | Ensure `docs/src/content.config.ts` exists and every `sidebar` slug in `astro.config.mjs` has a matching file |
| Mermaid diagram renders as a code block | `astro-mermaid` must be listed **before** `starlight` in `astro.config.mjs` integrations |
| Broken-link build error | Fix the `[text](/path/)` — `npm run build` validates internal links |
