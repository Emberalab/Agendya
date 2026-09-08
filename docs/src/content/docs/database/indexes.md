---
title: Índices y restricciones
description: >-
  Cada índice y restricción explícitos del esquema, y la consulta a la que sirve
  cada uno.
---

El conjunto de índices se ajustó deliberadamente (migración
`20260907120000_optimize_booking_indexes`). El razonamiento está recogido en
comentarios del esquema y se reproduce aquí.

## Restricciones de unicidad

| Modelo | Restricción | Propósito |
| --- | --- | --- |
| `Professional` | `email @unique` | Identidad de login; también sirve la búsqueda por igualdad |
| `Professional` | `slug @unique` | Resolución de la URL pública (`findFirst({ slug, isActive })`) |
| `Professional` | `googleId @unique` | Enlace de cuenta OAuth |
| `Booking` | `cancellationToken @unique` | Rutas públicas con token (`/public/bookings/:token`) |
| `ScheduleException` | `@@unique([professionalId, date])` | Un bloqueo por día de calendario; Prisma `P2002` → `409 "Ya existe un bloqueo para esa fecha."` |

:::note
`slug` y `googleId` ya son `@unique`; el índice btree de la restricción sirve
completamente igualdad y orden, así que **no se agrega un `@@index` secundario**
para ellos.
:::

## Índices secundarios

### Service

| Índice | Sirve a |
| --- | --- |
| `@@index([professionalId, isActive])` | Página pública — servicios activos de un profesional |
| `@@index([professionalId, deletedAt])` | Lista del panel y conteos de límite de plan — servicios no borrados de un profesional |

### WorkingHour

| Índice | Sirve a |
| --- | --- |
| `@@index([professionalId, dayOfWeek])` | Disponibilidad + `assertSlotWithinSchedule` — los bloques de este profesional para un día de la semana |

### Booking

| Índice | Sirve a |
| --- | --- |
| `@@index([professionalId, startAt])` | Lista de agenda — reservas de un profesional en un rango de fechas, cualquier estado |
| `@@index([professionalId, status, startAt])` | Disponibilidad y la guarda de solapamiento serializable — igualdad `status = CONFIRMED` + rango `startAt`, acotado a reservas vivas en lugar de recorrer cada fila pasada |
| `@@index([status, startAt])` | Barridos cron globales — consultas de ventana de `RemindersScheduler` y el `updateMany` de `ExpirationScheduler`, sin filtro por profesional |
| `@@index([serviceId])` | Columna FK (Postgres **no** indexa las FK automáticamente) — protege el camino `SetNull` y las búsquedas de "reservas de este servicio" de un escaneo completo |

## Restricciones que viven en el código, no en la BD

Algunos invariantes los impone la capa de aplicación en lugar de una
restricción de BD:

| Invariante | Impuesto por |
| --- | --- |
| No hay dos reservas `CONFIRMED` que se solapen para un profesional | Transacción `Serializable` + `findFirst` explícito de solapamiento en `commitBookingSlot` / `commitReschedule`, reintentado ante fallo de serialización (`40001` / Prisma `P2034`) |
| Los bloques de horario de un día no se solapan | `setWorkingHoursSchema.superRefine` (Zod), antes de la escritura en BD |
| Una reserva a domicilio requiere una dirección y un servicio habilitado para domicilio | `BookingsService.resolveServiceSelection` |
| El conteo de servicios dentro del límite del plan | `ServicesService.assertWithinPlanLimit` (`PLAN_SERVICE_LIMITS`) |
| `endMinute > startMinute` | `workingHourEntrySchema.refine` (Zod) |

:::tip[Registro de auditoría]
Una auditoría de arquitectura de base de datos (septiembre de 2026, ver la
memoria local del repo) concluyó que el esquema es sólido para la Fase 1.
Diferido con justificación: una entidad `Customer`, filas de línea de detalle
por servicio (actualmente modeladas mediante el snapshot combinado), un tipo de
columna `uuid` nativo y el particionado de tablas.
:::
