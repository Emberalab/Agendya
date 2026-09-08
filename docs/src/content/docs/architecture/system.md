---
title: Arquitectura del sistema
description: El sistema completo, sus procesos y las fronteras entre ellos.
---

```mermaid
flowchart TB
  subgraph client["Cliente — navegador"]
    direction TB
    R["React Router 7<br/>división de código por ruta"]
    Q["TanStack Query<br/>caché de estado de servidor"]
    Z["Zustand<br/>auth + tema (persistido)"]
    AC["apiClient<br/>envoltorio de fetch, inyecta el JWT"]
    R --> Q --> AC
    Z --> AC
  end

  subgraph api["API — NestJS 11 (Node 24)"]
    direction TB
    MW["helmet + CORS<br/>(bootstrap.ts)"]
    TG["ThrottlerGuard (global)<br/>100 req / 60s por defecto"]
    subgraph modules["módulos"]
      AU["AuthModule"]
      PR["ProfessionalsModule"]
      SV["ServicesModule"]
      SC["SchedulesModule"]
      BK["BookingsModule"]
      UP["UploadModule"]
    end
    CRON["crons de ScheduleModule<br/>*/15 * * * *"]
    MW --> TG --> modules
  end

  DB[("PostgreSQL 16")]
  GO["Google OAuth 2.0"]
  RS["Resend"]
  CL["Cloudinary"]

  AC -- "HTTPS / JSON" --> MW
  modules --> DB
  CRON --> DB
  AU <--> GO
  BK --> RS
  CRON --> RS
  UP --> CL
```

## Procesos

| Proceso | Runtime | Responsabilidades |
| --- | --- | --- |
| **Web** | Bundle estático servido al navegador (build de Vite) | UI, enrutamiento, estado del cliente, validación de formularios, llamadas a la API |
| **API** | Un único proceso Node.js | Enrutamiento HTTP, autenticación, validación, reglas de negocio, acceso a la BD, correo, subidas **y** las tareas cron en proceso |

Los schedulers cron (`RemindersScheduler`, `ExpirationScheduler`) corren
**dentro del proceso de la API** vía `@nestjs/schedule`
`ScheduleModule.forRoot()` — no hay un worker aparte. Cada job `@Cron` es
`*/15 * * * *` (cada 15 minutos) y se protege con `DISABLE_SCHEDULED_JOBS`.

## Fronteras de confianza

```mermaid
flowchart LR
  U["Internet público<br/>(clientes, sin autenticar)"] -->|"/public/** , /auth/**"| API
  P["Profesional autenticado<br/>(bearer JWT)"] -->|"/professionals , /services , /schedules , /bookings , /upload"| API
  API -->|"secretos servidor a servidor"| EXT["Google · Resend · Cloudinary"]
  API -->|"cadena de conexión"| DB[("PostgreSQL")]
```

- Superficie **sin autenticar**: `GET /`, `GET /health`, `POST /auth/register`,
  `POST /auth/login`, las rutas de Google OAuth y todo lo que cuelga de
  `/public/**` (profesional-por-slug, disponibilidad, crear reserva y la
  lectura/edición/cancelación/reprogramación de reserva con token).
- Superficie **autenticada**: protegida por `JwtAuthGuard` — `/auth/me`,
  `/professionals/**` (salvo el subcontrolador público), `/services/**`,
  `/schedules/**`, `/bookings` (agenda + acciones del profesional),
  `/upload/**`.
- La propiedad siempre se revalida en la capa de servicio con
  `where: { id, professionalId }` — un JWT válido del profesional A no puede
  tocar las filas del profesional B.

## Preocupaciones transversales

| Preocupación | Dónde |
| --- | --- |
| Cabeceras de seguridad | `helmet()` en `bootstrap.ts` (CSP completa — API JSON, sin HTML) |
| CORS | Función de origen a medida en `bootstrap.ts` + `common/utils/cors.util.ts` (`WEB_URL` configurado + cualquier origen localhost/red privada) |
| Rate limiting | Guard global de `@nestjs/throttler`; overrides por ruta con `@Throttle` |
| Validación de entrada | `ZodValidationPipe` con esquemas de `@agendya/types`, por ruta |
| Autenticación | `passport-jwt` (`JwtStrategy` recarga al profesional y comprueba `isActive`) |
| Configuración | `@nestjs/config` global, `config/configuration.ts` |
| Zonas horarias | `common/utils/timezone.util.ts` (`date-fns-tz`) |
| Errores | Subclases de `HttpException` de Nest → JSON `{ statusCode, message, error }` |

Ver [Arquitectura del backend](/architecture/backend/) para el detalle interno
de los módulos y [Arquitectura de la API](/api/conventions/) para las
convenciones de rutas.
