---
title: Solución de problemas
description: Problemas habituales del desarrollo local y sus soluciones.
---

## Setup e instalación

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `npm install` falla en el import de `@agendya/types` | `postinstall` no construyó el paquete | `npm run build -w packages/types`, luego reinstala |
| `Cannot find module '@prisma/client'` / faltan tipos | Cliente de Prisma sin generar | `cd apps/api && npx prisma generate` |
| Error de engine / versión de Node | No estás en Node 24 | `nvm use` (o `nvm install`) — `.nvmrc` dice `24` |
| Errores de `tsc` solo en `apps/web` sobre `@agendya/types` | `packages/types/dist` obsoleto | reconstruye types; corre su `dev --watch` mientras desarrollas |

## Base de datos

| Síntoma | Causa | Solución |
| --- | --- | --- |
| La API no arranca, `ECONNREFUSED ...:5433` | Contenedor de Postgres sin arrancar | `docker compose -f infra/docker-compose.yml up -d` |
| `password authentication failed` | `DATABASE_URL` no coincide con el contenedor | Vuelve a copiar `apps/api/.env.example`; usuario/pass/db = `agendya` / `agendya_dev_password` / `agendya_dev`, puerto `5433` |
| `P3005 database schema is not empty` / drift | Cambios manuales del esquema, o un compose incorrecto | `npx prisma migrate reset` (solo desarrollo — borra datos) |
| Faltan tablas tras clonar | Migraciones nunca aplicadas | `cd apps/api && npx prisma migrate deploy` |
| Nombres de contenedor raros / datos obsoletos | Usaste el `docker-compose.yml` de la raíz | Usa `infra/docker-compose.yml`; `docker compose -f infra/docker-compose.yml down -v` para resetear |
| Los specs e2e se cuelgan o son inestables | Tareas cron compitiendo con transacciones serializables | Asegúrate de que `DISABLE_SCHEDULED_JOBS=true` esté puesto para la corrida e2e |

## Auth y OAuth

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Advertencia: *"JWT_SECRET is set to the placeholder value"* | `JWT_SECRET` sigue siendo `dev-secret-change-in-production` | Bien en local; pon un valor fuerte y único en cualquier entorno real |
| `401` en cada llamada autenticada | Token expirado/ausente, o cuenta `isActive=false` | Vuelve a iniciar sesión; revisa la fila de `Professional` |
| El login devuelve *"Esta cuenta usa autenticación con Google"* | La cuenta no tiene `passwordHash` | Usa «Iniciar sesión con Google» |
| `GET /auth/google` → 404 / ruta ausente | Google sin configurar | Pon `GOOGLE_CLIENT_ID` **y** `GOOGLE_CLIENT_SECRET`; la estrategia solo se registra cuando ambos existen |
| Callback de OAuth → `403 "Solicitud de autenticación inválida."` | Cookie `state` ausente/expirada (5 min) o no coincide; bloqueo de cookies de terceros | Reinicia el flujo desde `/auth/google`; no guardes la URL del callback en marcadores |
| Sesión cerrada justo tras el login con Google | `GoogleCallbackPage` no pudo alcanzar `/auth/me` | Revisa `VITE_API_URL` / que la API esté arriba; el token sigue puesto, solo falta `businessName` |
| `/forgot-password` no hace nada | **No existe endpoint de restablecimiento** | Brecha conocida — ver [Seguridad](/security/#brechas-conocidas--todo) |

## CORS

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Navegador: *"blocked by CORS policy"* | El origen del frontend ≠ `WEB_URL` / `PUBLIC_WEB_URL` y no es una IP privada/localhost | Pon `WEB_URL` (dashboard) y `PUBLIC_WEB_URL` (apex) a los orígenes exactos; para pruebas por LAN usa `npm run dev:web:host` (las IP privadas se permiten automáticamente) |
| Las llamadas a la API van al host equivocado | `VITE_API_URL` sin definir y la página abierta desde un host raro | Define `VITE_API_URL` explícitamente, o abre la app desde `localhost` / la IP de LAN donde también está la API |

## Build y pruebas

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `vite build` falla en `tsc -b` | Error de tipos, a menudo `@agendya/types` obsoleto | Reconstruye types; `npm run typecheck` para el error real |
| Playwright: *"browserType.launch: Executable doesn't exist"* | Chromium sin descargar | `npm run test:e2e:install --workspace apps/web` |
| Playwright: puerto 5173 en uso / timeout de `webServer` | Dev server ya corriendo / atascado | Detén el otro proceso de Vite, o pon `E2E_PORT` |
| Vitest recoge specs de Playwright | — | Ya excluidos (`vite.config.ts` `exclude: ['tests/**']`); no pongas `*.test.tsx` bajo `tests/` |
| Confusión entre oxlint y ESLint | Linter equivocado para el workspace | `apps/web` = oxlint, `apps/api` = ESLint; corre `npm run lint` en la raíz para hacer ambos |

## Las reservas se comportan raro

| Síntoma | Explicación |
| --- | --- |
| Un espacio mostrado en el asistente falla con `409` al enviar | Alguien lo reservó primero; la disponibilidad es orientativa, la guarda de solapamiento serializable es la autoridad |
| No se puede cancelar/reprogramar cerca de la cita | Ventana de `cancellationPolicyHours` (por defecto 24h) — `403` por diseño |
| Una reserva confirmada pasada ahora muestra *"Vencida"* | `ExpirationScheduler` (cada 15 min) o un autosanado perezoso pasó `CONFIRMED → EXPIRED` |
| Los correos de recordatorio no llegan en local | Sin `RESEND_API_KEY` → se registran: busca `[dev] Email a …` en la consola de la API |
| ¿Las reservas canceladas/completadas siguen ocupando espacios? | No lo hacen — solo `CONFIRMED` cuenta como ocupado en la disponibilidad |

## Sitio de documentación

| Síntoma | Solución |
| --- | --- |
| `npm run dev` en `docs/` falla: error de content collection | Asegúrate de que `docs/src/content.config.ts` exista y de que cada slug de `sidebar` en `astro.config.mjs` tenga un archivo correspondiente (en español bajo `docs/src/content/docs/` y en inglés bajo `docs/src/content/docs/en/`) |
| Un diagrama de Mermaid se renderiza como bloque de código | `astro-mermaid` debe ir **antes** de `starlight` en las integraciones de `astro.config.mjs` |
| Error de build por enlace roto | Corrige el `[texto](/ruta/)` — `npm run build` valida los enlaces internos |
