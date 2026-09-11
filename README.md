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
   - For Web Push notifications to the PWA, generate a VAPID keypair with `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in `apps/api/.env`. Left blank, push is disabled and the notification feed still delivers over SSE.
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

- `npm run verify` — lint + typecheck + test + build across all workspaces, in that order, stopping at the first failure (run this before committing)
- `npm run build` — build all workspaces
- `npm run lint` — lint all workspaces
- `npm run test` — run tests in all workspaces
- `npm run typecheck` — typecheck all workspaces
- `npm run dev:web:host` — run the web app exposed on the LAN (useful for testing from another device)
- `npm run verify:pwa` — build the web app, serve the production bundle, and run headless-Chromium checks over the manifest, the service worker, the precache and offline navigation

## PWA / Local Network Development

Agendya's web app is an installable PWA (offline app shell + OS-level Web Push to
the professional). The push permission prompt and "Add to Home Screen" only work
over `localhost` or **HTTPS**, so testing on a real phone means reaching the dev
machine over the LAN or an HTTPS tunnel. Nothing here is needed for normal
`localhost` development.

### How the pieces fit together

```
Phone / tablet ── LAN IP or HTTPS tunnel ──▶ Vite dev server (:5173)
                                              │  serves the web app
                                              │  proxies /api  ─────▶ NestJS API (:4000) ──▶ PostgreSQL (:5433)
                                              └  proxies /api/realtime/stream (SSE), untouched
```

- The frontend **never hardcodes the API host**. `apps/web/src/shared/api/apiClient.ts`
  resolves it at runtime: `VITE_API_URL` if set → else `http://localhost:4000`
  on localhost → else **same-origin `/api`**, which the Vite dev server proxies
  to `:4000` (`apps/web/vite.config.ts` → `server.proxy`). So a LAN IP or an
  ever-changing tunnel hostname just works, and an HTTPS page reaches the API
  over HTTPS with no mixed-content block.
- The API listens on `0.0.0.0` (`apps/api/src/main.ts`), so it is reachable from
  the proxy on any interface.
- Auth is a **JWT in the `Authorization` header** (no cookies), so there is no
  `SameSite`/`Secure`/CSRF surface for cross-device use. The SSE stream uses the
  same header via `fetch` (not `EventSource`).

### Prerequisites

- Node.js 24 (`.nvmrc`), npm 11, Docker (Postgres) — same as the main setup above.
- The phone and the dev machine on the **same Wi-Fi** (LAN mode), or a tunnel
  client for HTTPS mode:
  - **cloudflared** — `brew install cloudflared` (no account needed for quick
    tunnels), or
  - **ngrok** — `brew install ngrok` + a free account.
  - Only `*.trycloudflare.com`, `*.ngrok-free.app` and `*.ngrok.io` are
    allow-listed in `vite.config.ts` → `server.allowedHosts`. Add the host there
    for any other provider.
- For Web Push: a VAPID keypair in `apps/api/.env` (see below). Optional — with
  it unset, push is disabled and the notification feed still works over SSE.
- For Google sign-in from another device: see [Google OAuth](#google-oauth) — it
  needs extra configuration and does **not** work through an ephemeral tunnel
  out of the box.

### Environment setup

Copy the example env files (`cp apps/api/.env.example apps/api/.env`,
`cp apps/web/.env.example apps/web/.env`) and review:

| File | Variable | Role |
| --- | --- | --- |
| `apps/api/.env` | `WEB_URL` | CORS allow-origin **and** the base the Google OAuth callback redirects back to. `http://localhost:5173` by default. Only change it for tunnelled OAuth. |
| `apps/api/.env` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google sign-in. `GOOGLE_CALLBACK_URL` defaults to `http://localhost:4000/auth/google/callback`. |
| `apps/api/.env` | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push. Generate the pair with `npx web-push generate-vapid-keys`. All three must be set for delivery; any missing → push disabled. |
| `apps/api/.env` | `REALTIME_HEARTBEAT_MS` | Optional. SSE keep-alive interval (default `25000`); lower it if a proxy drops idle connections sooner. |
| `apps/web/.env` | `VITE_API_URL` | **Leave unset** for LAN/tunnel dev (auto-detect + `/api` proxy). Set it only to pin a fixed backend (staging), or in a **production build**, where there is no Vite proxy and the app must be told the API origin. Client vars must be prefixed `VITE_`. |

`.env` files are gitignored — never commit real secrets. Keep `.env.example`
in sync when adding a variable.

### Running locally (normal development)

```bash
docker compose -f infra/docker-compose.yml up -d   # Postgres
npm run dev:api                                     # API on :4000  (terminal 1)
npm run dev:web                                     # web on :5173  (terminal 2)
```

Open `http://localhost:5173`. The service worker registers in dev
(`devOptions.enabled` in `vite.config.ts`), so the manifest, the install icon
and DevTools ▸ Application work without a production build.

### Running the PWA on another device (LAN)

```bash
docker compose -f infra/docker-compose.yml up -d
npm run dev:api            # terminal 1
npm run dev:web:host       # terminal 2 — Vite prints a "Network:" URL
```

1. Note the `Network: http://<dev-machine-LAN-IP>:5173/` line Vite prints.
2. Open that URL on the phone (same Wi-Fi).
3. The app calls the API at `http://<same-IP>:5173/api`, proxied to `:4000`.
4. Web Push still needs HTTPS on iOS; Android Chrome allows it on a private-IP
   origin. For full push testing use the tunnel flow below.

### Running the PWA on another device (HTTPS tunnel)

```bash
docker compose -f infra/docker-compose.yml up -d
npm run dev:api            # terminal 1
npm run dev:web:host       # terminal 2

# terminal 3 — pick one, pointed at the Vite port:
cloudflared tunnel --url http://localhost:5173
#   or
ngrok http 5173
```

1. The tunnel client prints an HTTPS URL (e.g.
   `https://<random>.trycloudflare.com`).
2. Open it on the phone. Assets and `/api` (REST + SSE) all flow through the one
   tunnel; the API base is auto-detected as `<tunnel>/api`.
3. Install: Android Chrome ▸ ⋮ ▸ *Install app*; iOS Safari ▸ Share ▸ *Add to
   Home Screen* (iOS 16.4+ for Web Push, and the app must be launched from the
   home-screen icon).
4. In the installed app, open the notification centre and tap **Activar** on the
   push banner to grant permission and register the device.

The tunnel hostname changes every run — that is fine, nothing stores it. Only the
first-party OAuth flow needs a stable hostname.

### Google OAuth

The OAuth callback (`apps/api/src/modules/auth/auth.controller.ts`) redirects the
browser to **`WEB_URL`** after Google authenticates, and Google only redirects to
the exact `GOOGLE_CALLBACK_URL` registered in the Google Cloud Console. With the
defaults both are `localhost`, so **Google sign-in from a phone/tunnel does not
work until you reconfigure it**. Email + password login works everywhere with no
changes.

To enable Google sign-in through a tunnel you need a **stable** tunnel hostname
(cloudflared named tunnel, or an ngrok reserved domain) and then:

1. In Google Cloud Console ▸ *APIs & Services* ▸ *Credentials* ▸ your OAuth 2.0
   client:
   - **Authorized JavaScript origins**: `https://<stable-tunnel-host>`
   - **Authorized redirect URIs**:
     `https://<stable-tunnel-host>/api/auth/google/callback`
     (the `/api` prefix is stripped by the Vite proxy before it reaches Nest at
     `/auth/google/callback`).
2. In `apps/api/.env`:
   - `WEB_URL=https://<stable-tunnel-host>`
   - `GOOGLE_CALLBACK_URL=https://<stable-tunnel-host>/api/auth/google/callback`
3. Restart the API. Keep the production OAuth client/redirects untouched — use a
   separate dev client if possible.

### Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| **CORS error in the console** | The page origin isn't allowed. LAN/tunnel requests go same-origin through `/api` and shouldn't hit CORS at all — if they do, `VITE_API_URL` is probably set and pointing cross-origin; unset it. The API allows `WEB_URL` + any localhost/private-IP origin (`apps/api/src/common/utils/cors.util.ts`). |
| **`Blocked request. This host ("…") is not allowed`** (from Vite) | Add the tunnel domain to `server.allowedHosts` in `apps/web/vite.config.ts`. |
| **OAuth redirects to `http://localhost:5173` on the phone** | Expected with default config — see [Google OAuth](#google-oauth). Use email/password, or set up a stable tunnel + `WEB_URL` + Console redirect URIs. |
| **`redirect_uri_mismatch` from Google** | The `GOOGLE_CALLBACK_URL` isn't in the Console's Authorized redirect URIs, character-for-character (scheme, host, `/api/auth/google/callback`). |
| **Mixed-content / API calls blocked on HTTPS** | Something is calling `http://localhost:4000` directly. Confirm `VITE_API_URL` is unset so the app uses same-origin `/api`. |
| **Service worker won't update / stale UI** | The SW is `registerType: 'autoUpdate'` — a new deploy activates on the next full page load. To force it: DevTools ▸ Application ▸ Service Workers ▸ *Unregister*, then reload. There is no in-app "new version" prompt yet. |
| **Stale cache** | Only the static app shell (JS/CSS/HTML/icons) is precached; API responses are never cached. DevTools ▸ Application ▸ Clear storage wipes it. |
| **API unavailable from the device** | Start the API with `npm run dev:api` (it binds `0.0.0.0`). Check a firewall isn't blocking `:5173`/`:4000` on the LAN. Tunnel: confirm the tunnel points at `5173`, not `4000`. |
| **Notifications don't arrive in real time** | SSE (`GET /api/realtime/stream`) may be buffered by a proxy. The feed still catches up on reload/reconnect from `GET /notifications` — it is the source of truth. Lower `REALTIME_HEARTBEAT_MS` if a proxy closes idle connections. |
| **Push banner missing or "Activar" does nothing** | Server has no VAPID keys (`GET /api/notifications/push/public-key` returns `null`), the browser blocked notifications, or (iOS) the app isn't launched from the installed home-screen icon. |
| **Push enabled but no native notification appears** | Push subscriptions are **per browser / per device** — enabling it on one device does not enable it on another; click **Activar** in the notification centre on *each* device (`GET /api/notifications/push/status` → `subscribed`). Then check the OS: **macOS** System Settings ▸ Notifications ▸ *Google Chrome* (and the installed *Agendya* app) → Allow Notifications on, alert style not "None", Do Not Disturb / Focus off. `node apps/api/scripts/push-doctor.mjs --send` sends a real test push to every registered device and prints the push service's response — if it prints `OK` and nothing shows, the block is at the OS/browser level, not in Agendya. In dev the service worker is a Vite module worker; keep `npm run dev:web:host` running and reopen the PWA after any Vite restart. |
| **Cookies not sent** | Agendya uses a bearer token, not cookies — if a request is unauthenticated, the JWT in `localStorage` (`agendya-auth`) is missing or expired; log in again. |
| **PWA not installable** | Needs HTTPS (or localhost), a reachable manifest, 192 + 512 icons and an active service worker. Run `npm run verify:pwa`, or check DevTools ▸ Application ▸ Manifest for the specific error. |
