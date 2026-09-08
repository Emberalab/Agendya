---
title: Arquitectura general
description: >-
  Las piezas que componen Agendya y cómo viaja una petición desde el navegador
  hasta PostgreSQL y de vuelta.
---

Agendya es un **monorepo de dos apps** más un paquete de contratos compartido:

```mermaid
flowchart TB
  subgraph Browser["Navegador"]
    Web["apps/web<br/>React 19 + Vite<br/>React Router · TanStack Query · Zustand"]
  end

  subgraph Server["Node.js 24"]
    API["apps/api<br/>NestJS 11<br/>Auth · Professionals · Services · Schedules · Bookings · Upload"]
    Cron["crons de @nestjs/schedule<br/>RemindersScheduler · ExpirationScheduler"]
  end

  DB[("PostgreSQL 16<br/>vía Prisma 7 + @prisma/adapter-pg")]

  Google["Google OAuth 2.0"]
  Resend["Resend<br/>correo transaccional"]
  Cloudinary["Cloudinary<br/>subida de logo / portada"]

  Web -- "REST / JSON sobre HTTPS<br/>JWT en la cabecera Authorization" --> API
  API --> DB
  Cron --> DB
  API -- "flujo de redirección OAuth" --> Google
  API -- "correos" --> Resend
  API -- "subida de imagen" --> Cloudinary
  Web -. "carga URLs de imagen derivadas<br/>(f_auto,q_auto)" .-> Cloudinary

  Shared["packages/types<br/>@agendya/types — esquemas Zod"]
  Shared -. "contrato en tiempo de compilación" .-> Web
  Shared -. "contrato en compilación + validación en runtime" .-> API
```

## Camino de una petición

Toda petición que muta datos sigue el mismo camino por capas:

```
Usuario → componente React
        → hook del módulo (TanStack Query / RHF)
        → api.ts del módulo (apiClient: fetch + JWT)
        → Controller de NestJS  (ruta, ZodValidationPipe, guards)
        → Service de NestJS     (reglas de negocio, comprobaciones de política)
        → PrismaService         (consultas tipadas, transacciones)
        → PostgreSQL
```

Ver [Flujo de datos](/architecture/data-flow/) para un ejemplo completo (crear
una reserva) y [Arquitectura del backend](/architecture/backend/) para el
desglose de módulos.

## Repositorios y workspaces

| Workspace | Nombre del paquete | Stack | Propósito |
| --- | --- | --- | --- |
| `apps/api` | `api` | NestJS 11, Prisma 7, PostgreSQL | API REST, autenticación, tareas cron |
| `apps/web` | `web` | React 19, Vite, TS | Panel del profesional + reserva pública |
| `packages/types` | `@agendya/types` | Zod | Esquemas y constantes de petición/respuesta compartidos |

`apps/web/Agendya-main/` es una **exportación de diseño de Figma Make** que se
conserva solo como referencia. Está en `.gitignore` y no es la app en ejecución
— ver [Estructura del repositorio](/overview/repository-layout/).

## Características clave

- **Autenticación de API sin estado.** El JWT viaja en la cabecera
  `Authorization`, nunca en una cookie, así que `credentials` de CORS se
  mantiene en `false`. (La única cookie del sistema es la cookie efímera de
  `state` de OAuth para protección contra CSRF de login.)
- **Contrato primero.** La forma de un payload cambia primero en
  `packages/types`, luego en ambos consumidores. La API revalida cada
  cuerpo/query con el mismo esquema Zod en runtime vía `ZodValidationPipe`.
- **Correcto con las zonas horarias.** Cada profesional tiene una `timezone`
  IANA. La interpretación de hora de pared (horario de atención, «hoy») pasa por
  `common/utils/timezone.util.ts`; los instantes absolutos (`startAt`) se
  comparan directamente.
- **Escrituras de reserva seguras ante concurrencia.** Los commits de espacios y
  las reprogramaciones corren en transacciones `Serializable` con reintentos
  acotados ante fallo de serialización.
- **Degradación elegante de terceros.** Sin `RESEND_API_KEY` → los correos se
  registran en consola. Sin `CLOUDINARY_URL` → el endpoint de subida devuelve
  503. Sin credenciales de Google → la estrategia OAuth simplemente no se
  registra.
