---
title: Despliegue
description: Build de producción, migraciones, CI y lo que el repositorio especifica y no especifica sobre el hosting.
---

:::note[Dónde corre cada cosa]
- **API:** Railway (`agendya-api`), environments `dev` (rama `dev` →
  `https://agendya-dev.up.railway.app`) y `production` (rama `main` →
  `https://api.agendya.co`). El start command aplica `prisma migrate deploy`
  y `npm run start:prod`.
- **Web:** GoDaddy/cPanel. `.github/workflows/deploy-web.yml` construye
  `apps/web` con `VITE_API_URL` / `VITE_PUBLIC_SITE_URL` / `VITE_WAITLIST_URL` y sube `dist/` por
  FTPS: rama `dev` → `https://app-dev.agendya.co`, rama `main` →
  `https://app.agendya.co`. En cPanel, el Document Root de `agendya.co` debe
  ser **la misma carpeta** que `app.agendya.co` para que `/{slug}` público
  viva en el apex.
- **CI:** `.github/workflows/ci.yml` (lint, typecheck, test, build) en push
  y PR a `dev` y `main`. No despliega.
:::

## Lo que el repo define

### Builds de producción

| Artefacto | Comando | Salida | Se ejecuta con |
| --- | --- | --- | --- |
| Tipos compartidos | `npm run build -w packages/types` (también en `postinstall`) | `packages/types/dist/` | — |
| API | `npm run build -w apps/api` → `nest build` | `apps/api/dist/` | `node apps/api/dist/main` (o `npm run start:prod` en `apps/api`) |
| Web | `npm run build -w apps/web` → `tsc -b && vite build` | `apps/web/dist/` (estático) | cualquier host estático / CDN |

`npm run build` en la raíz construye los tres.

### Requisitos de runtime (API)

- Node.js 24.
- Env: `DATABASE_URL`, `JWT_SECRET` (**fuerte, no el de ejemplo**), `WEB_URL`
  (dashboard: CORS y OAuth), `PUBLIC_WEB_URL` (apex de reservas y enlaces de
  cancelación). Opcionales: `JWT_EXPIRES_IN`, `PORT`, `SLOT_GRID_MINUTES`,
  `RESEND_API_KEY`, `CLOUDINARY_URL`, `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`, `WOMPI_PUBLIC_KEY` /
  `WOMPI_INTEGRITY_KEY` / `WOMPI_EVENTS_SECRET` (checkout de planes). Ver
  [Variables de entorno](/getting-started/environment/).
- Un PostgreSQL alcanzable. Las tareas cron en proceso (`RemindersScheduler`,
  `ExpirationScheduler`) corren donde corra el proceso de la API — **ejecuta
  exactamente una instancia**, o duplicarán trabajo (no hay lock distribuido).

### Requisitos de runtime (web)

- Solo archivos estáticos. Establece `VITE_API_URL` en **tiempo de build** al
  origen de la API (Vite lo inyecta). Fallback de SPA: toda ruta desconocida
  debe servir `index.html` (enrutamiento del lado del cliente, incl. `/:slug`).

### Migraciones de base de datos

```bash
cd apps/api
npx prisma migrate deploy        # aplica las migraciones pendientes, sin prompts
```

Ejecútalo como paso de release **antes** de que la nueva versión de la API sirva
tráfico. Las migraciones son solo hacia adelante; para revertir, despliega el
código anterior + una nueva migración compensatoria.

```mermaid
flowchart LR
  A["git push / merge a main"] --> B["build de todos los workspaces"]
  B --> C["prisma migrate deploy<br/>(apps/api, contra la BD de prod)"]
  C --> D["arrancar/reemplazar el proceso de la API<br/>(una sola instancia — crons)"]
  B --> E["publicar apps/web/dist<br/>a host estático / CDN"]
  D & E --> F["smoke: GET /health · cargar /login"]
```

## CI (lo que realmente corre hoy)

`.github/workflows/ci.yml`, en push y PR a `dev` y `main`:

```mermaid
flowchart LR
  subgraph "job: ci (servicio Postgres 16)"
    L["npm run lint"] --> T["npm run typecheck"]
    T --> M["prisma migrate deploy"]
    M --> U["npm run test"]
    U --> E["apps/api: npm run test:e2e"]
    E --> B["npm run build"]
  end
  subgraph "job: web-e2e"
    P1["playwright install chromium"] --> P2["apps/web: npm run test:e2e"]
    P2 --> P3["subir el artefacto playwright-report"]
  end
```

Runners: `ubuntu-latest`, Node desde `.nvmrc`, `npm ci`. Env de CI:
`DATABASE_URL` (contenedor de servicio en `:5432`), `JWT_SECRET: ci-test-secret`,
`JWT_EXPIRES_IN`, `SLOT_GRID_MINUTES`, `PORT`. Sin credenciales de terceros.

## Desplegar este sitio de documentación

Se incluye un workflow: **`.github/workflows/docs.yml`** construye `docs/` con
Astro y publica en **GitHub Pages** en los push a `main` que tocan `docs/**`.

- Activa Pages → «GitHub Actions» en los ajustes del repo.
- Pon la URL real en `docs/astro.config.mjs` (`site`, y `base: '/Agendya/'` para
  un sitio de proyecto) — actualmente `https://emberalab.github.io` con un
  `TODO`.
- Local: `cd docs && npm run build && npm run preview`.

## TODO — lo que sigue abierto

- Política de backups del Postgres de Railway.
- Una sola instancia de API por environment (los crons no tienen lock
  distribuido).
