---
title: Modelos de Prisma
description: Referencia campo por campo de cada modelo en schema.prisma.
---

Todos los modelos usan `id String @id @default(uuid())`, `createdAt DateTime
@default(now())` y (salvo `ScheduleException`) `updatedAt DateTime @updatedAt`.

## Professional

La cuenta del barbero/peluquero.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `email` | `String @unique` | Identidad de login |
| `passwordHash` | `String?` | Hash bcrypt; `null` para cuentas solo de Google |
| `googleId` | `String? @unique` | Se establece al enlazar con una cuenta de Google |
| `businessName` | `String` | Nombre visible; también siembra el slug |
| `slug` | `String @unique` | Segmento de la URL pública de reservas (`/:slug`) |
| `category` | `String?` | p. ej. "Barbería" |
| `photoUrl` / `logoUrl` / `coverImageUrl` | `String?` | URLs http(s) (Cloudinary en la práctica) |
| `brandColor` | `String? @default("#4F46E5")` | Hex de 6 dígitos |
| `description` | `String?` | Texto libre, ≤ 500 caracteres (impuesto en Zod) |
| `timezone` | `String @default("America/Bogota")` | Zona IANA |
| `cancellationPolicyHours` | `Int @default(24)` | Antelación mínima para cambios del cliente; la UI restringe a `1,2,3,4,6,24` |
| `plan` | `Plan @default(BASIC)` | `BASIC` \| `PRO` |
| `isActive` | `Boolean @default(true)` | `JwtStrategy` rechaza tokens de cuentas inactivas |

Relaciones: `services`, `workingHours`, `scheduleExceptions`, `bookings`
(todas `[]`).

## Service

Una oferta.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `name` | `String` | 2–100 caracteres |
| `description` | `String?` | ≤ 500 caracteres |
| `durationMinutes` | `Int` | Duración en local; la UI ofrece una lista fija de opciones, Zod acota `5–480` |
| `priceCents` | `Int @default(0)` | Unidades menores enteras, `0 … 100_000_000` |
| `isActive` | `Boolean @default(true)` | Oculto de la página pública cuando es `false` |
| `homeServiceEnabled` | `Boolean @default(false)` | Interruptor de la variante a domicilio |
| `homeDurationMinutes` | `Int?` | Obligatorio (Zod) cuando `homeServiceEnabled` |
| `homePriceCents` | `Int?` | Obligatorio (Zod) cuando `homeServiceEnabled` |
| `sortOrder` | `Int @default(0)` | Orden de visualización ascendente; al crear se pone el conteo actual |
| `deletedAt` | `DateTime?` | Lápida de borrado lógico; todas las consultas filtran `deletedAt: null` |

## WorkingHour

Un bloque recurrente semanal. Un día de la semana puede tener **varias** filas
(hasta 6, sin solaparse — impuesto en `setWorkingHoursSchema`).

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `dayOfWeek` | `Weekday` | Enum |
| `startMinute` | `Int` | Minutos desde medianoche, `0–1439` |
| `endMinute` | `Int` | Minutos desde medianoche, `1–1440`, debe ser `> startMinute` |

`setWorkingHours` reemplaza el conjunto completo por profesional dentro de una
transacción (`deleteMany` + `createMany`).

## ScheduleException

Una fecha cerrada puntual. Sin `updatedAt`.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `date` | `DateTime @db.Date` | Columna solo fecha; se guarda como la medianoche UTC de ese día de calendario |
| `reason` | `String?` | Etiqueta opcional |
| | | `@@unique([professionalId, date])` — una excepción por día; violación → `409` |

## Booking

Una cita de un cliente.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `serviceId` | `String?` | FK, `onDelete: SetNull` — a `null` si se borra el servicio |
| `serviceNameSnapshot` | `String` | Nombre combinado al momento de reservar (`"Corte + Barba"` para varios servicios) |
| `durationMinutesSnapshot` | `Int` | Duración total al momento de reservar; determina `endAt` y el cálculo de reprogramación |
| `customerName` / `customerEmail` / `customerPhone` | `String` | Capturados en el formulario público; sin cuenta |
| `customerNote` | `String?` | Opcional, ≤ 500 caracteres, recortado |
| `atHome` | `Boolean @default(false)` | Reserva a domicilio |
| `customerAddress` | `String?` | Obligatorio cuando `atHome` (chequeo a nivel de servicio) |
| `startAt` / `endAt` | `DateTime` | Instantes absolutos (UTC) |
| `status` | `BookingStatus @default(CONFIRMED)` | Ver el [ciclo de vida](/database/appointment-lifecycle/) |
| `cancellationToken` | `String @unique @default(uuid())` | Impulsa los enlaces públicos de cancelar/reprogramar/editar (`/bookings/:token`) |
| `cancelledAt` | `DateTime?` | Se establece al cancelar |
| `cancelledBy` | `String?` | `"customer"` o `"professional"` |
| `reminder24hSentAt` / `reminder2hSentAt` | `DateTime?` | Marcadores de idempotencia para `RemindersScheduler` |

:::note[`PENDING` no se usa en la Fase 1]
El enum conserva `PENDING` (y `NO_SHOW`) pero ningún camino de código actual
crea una reserva `PENDING` ni establece `NO_SHOW`. Las reservas nuevas son
`CONFIRMED` de inmediato.
:::
