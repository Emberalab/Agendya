---
title: Variables de entorno
description: >-
  Cada variable de entorno que leen la API y la app web, con sus valores por
  defecto y qué se rompe cuando falta.
---

:::danger[Nunca subas secretos]
`.env` está en `.gitignore` para ambas apps. Mantén `.env.example` al día cuando
agregues una variable, pero solo con valores de ejemplo. Comparte los valores
reales de `RESEND_API_KEY` / `CLOUDINARY_URL` / credenciales de Google por un
gestor de contraseñas, nunca en texto plano ni en un PR.
:::

## API — `apps/api/.env`

Se leen vía `apps/api/src/config/configuration.ts` (mapeadas a claves tipadas de
`ConfigService`). Las carga `apps/api/src/env.ts` (`dotenv`) antes de que Nest
arranque.

| Variable | Ejemplo / por defecto | ¿Obligatoria? | Efecto si falta |
| --- | --- | --- | --- |
| `DATABASE_URL` | `postgresql://agendya:agendya_dev_password@localhost:5433/agendya_dev?schema=public` | **Sí** | Prisma no puede conectar; la API no arranca |
| `JWT_SECRET` | `dev-secret-change-in-production` | **Sí** | No se pueden firmar/verificar tokens |
| `JWT_EXPIRES_IN` | `7d` | No (por defecto `7d`) | Cae de vuelta a `7d` |
| `GOOGLE_CLIENT_ID` | *(vacío)* | No | La estrategia de Google OAuth no se registra; `/auth/google` no disponible |
| `GOOGLE_CLIENT_SECRET` | *(vacío)* | No | Igual que arriba |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/auth/google/callback` | No | Cae de vuelta al callback de localhost |
| `SLOT_GRID_MINUTES` | `15` | No (por defecto `15`) | Granularidad de los espacios de disponibilidad en minutos |
| `RESEND_API_KEY` | *(vacío)* | No | Los correos se registran en consola en lugar de enviarse |
| `CLOUDINARY_URL` | *(vacío)* | No | `POST /upload/image` devuelve `503 Service Unavailable` |
| `PORT` | `4000` | No (por defecto `4000`) | Puerto de escucha de la API |
| `WEB_URL` | `http://localhost:5173` | No (por defecto localhost) | Origen permitido de CORS, base de la redirección de éxito de OAuth, base del enlace de cancelación en los correos |

### Solo para pruebas

| Variable | La usa | Efecto |
| --- | --- | --- |
| `DISABLE_SCHEDULED_JOBS=true` | `RemindersScheduler`, `ExpirationScheduler` | El cuerpo de los crons retorna temprano, para que la suite e2e y sus transacciones serializables de reserva no compitan con los schedulers |

:::caution[El secreto JWT de ejemplo se señala]
`bootstrap.ts` registra una advertencia si `JWT_SECRET` sigue siendo
`dev-secret-change-in-production` (el valor de `.env.example`). Genera un secreto
fuerte y único antes de cualquier despliegue real.
:::

## Web — `apps/web/.env`

| Variable | Por defecto | Efecto |
| --- | --- | --- |
| `VITE_API_URL` | *(sin definir)* → `http://<host-de-la-página>:4000` | URL base que el navegador llama para la API. Déjala sin definir para localhost **y** para pruebas por LAN (`npm run dev:web:host`); defínela solo para apuntar a otro backend (p. ej. staging). |

`apiClient` la resuelve así:

```ts
const apiBaseUrl =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;
```

### Solo para E2E (`apps/web/tests/`)

`E2E_PORT`, `E2E_BASE_URL`, `E2E_API_URL`, `E2E_USER_EMAIL`,
`E2E_USER_BUSINESS_NAME`, `E2E_ACCESS_TOKEN` — todas con valor por defecto en
`playwright.config.ts` / el fixture de auth-setup. Sin secretos reales; la API
se stubea en el límite de red.

## Entorno de CI

`.github/workflows/ci.yml` define `DATABASE_URL` (apuntando al contenedor de
servicio de Postgres 16 en `:5432`), `JWT_SECRET: ci-test-secret`,
`JWT_EXPIRES_IN`, `SLOT_GRID_MINUTES`, `PORT`. Sin credenciales de terceros — la
estrategia de Google se omite y mail/upload solo se ejercitan por sus caminos
sin configurar.
