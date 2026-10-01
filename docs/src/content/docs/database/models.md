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
| `plan` | `Plan @default(FREE)` | `FREE` \| `BASIC` \| `ADVANCED` \| `BUSINESS` |
| `billingInterval` | `BillingInterval?` | `monthly` \| `annual`. Lo escribe un pago Wompi. `null` en Gratuito o si Super Admin asignó el plan a mano |
| `planStartedAt` | `DateTime?` | Momento del pago Wompi que abrió el periodo actual |
| `planExpiresAt` | `DateTime?` | Fin del periodo pagado (UTC). Mensual = +1 mes, anual = +1 año. Aún no hay job que baje a FREE |
| `lastWompiTransactionId` | `String? @unique` | Idempotencia: el mismo `tx` de Wompi no vuelve a alargar el periodo |
| `trialStartedAt` | `DateTime?` | Inicio del período de prueba de acceso completo (lo fija Super Admin). Queda puesto al terminar: marca la prueba como ya usada |
| `trialEndsAt` | `DateTime?` | Fin de la prueba (UTC). Activa mientras `trialStartedAt <= now < trialEndsAt`. Índice propio para el barrido horario |
| `role` | `PlatformRole @default(INDEPENDENT)` | `SUPER_ADMIN` \| `BUSINESS_ADMIN` \| `INDEPENDENT` |
| `accessStatus` | `AccessStatus @default(APPROVED)` | `PENDING` \| `APPROVED` \| `DECLINED`. Cuentas nuevas sin grant en beta cerrada nacen `PENDING`. `isActive` no se usa para esto |
| `isActive` | `Boolean @default(true)` | `JwtStrategy` rechaza tokens de cuentas inactivas |

Relaciones: `services`, `workingHours`, `scheduleExceptions`, `bookings`, `passwordResetTokens`
(todas `[]`).

## PasswordResetToken

Token de un solo uso para restablecer la contraseña de un profesional.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK a `Professional`, `onDelete: Cascade` |
| `tokenHash` | `String @unique` | SHA-256 del token aleatorio de 32 bytes (base64url). Solo se guarda el hash, nunca el token en claro |
| `expiresAt` | `DateTime` | Timestamp de expiración (UTC). Los tokens expiran después de 1 hora (`TOKEN_EXPIRY_HOURS = 1`) |
| `usedAt` | `DateTime?` | Se establece al momento de restablecer la contraseña exitosamente. Los tokens usados no se pueden reutilizar. Tokens no usados (`null`) de solicitudes previas se marcan como usados al generar uno nuevo |

Índice: `@@index([professionalId])`.

No tiene `updatedAt` porque son de un solo uso y nunca se actualizan excepto para marcar `usedAt`.

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

## Notification

Entrada del **centro de notificaciones** persistente de un profesional (ver
[Notificaciones](/features/notifications/#centro-de-notificaciones)). La fila es
la fuente de verdad; SSE y Web Push son canales de entrega.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK → `Professional`, `onDelete: Cascade` |
| `type` | `NotificationType` | `APPOINTMENT_CREATED` o `APPOINTMENT_CANCELLED` (cancelación del cliente). El enum reserva `APPOINTMENT_RESCHEDULED` / `APPOINTMENT_REMINDER` / `SYSTEM` para más adelante |
| `title` / `body` | `String` | Textos listos para mostrar (es-CO). También servirían de payload para Web Push |
| `data` | `Json` | `{ bookingId, customerName, serviceName, startAt }` — `bookingId` es la referencia de navegación; los otros campos evitan un join y son *point-in-time* |
| `readAt` | `DateTime?` | `null` mientras está sin leer |
| `createdAt` | `DateTime @default(now())` | |

No se copian `customerEmail` / `customerPhone` / `customerAddress` /
`customerNote` ni el `cancellationToken`.

:::note[Retención]
No hay borrado automático. Estrategia futura: un `@Cron` diario que elimine las
leídas con más de ~90 días, más un tope por profesional. Ver
[Notificaciones › Retención](/features/notifications/#retención).
:::

## PushSubscription

Una suscripción de **Web Push** del navegador para un profesional (ver
[Notificaciones › Web Push](/features/notifications/#web-push)). El dashboard,
tras conceder permiso, envía el `PushSubscription` del navegador; hay una fila
por dispositivo/navegador.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK → `Professional`, `onDelete: Cascade` |
| `endpoint` | `String @unique` | URL del servicio de push. Única globalmente — el mismo navegador re-suscribiéndose devuelve el mismo endpoint, así que un `upsert` mantiene una fila por dispositivo |
| `p256dh` / `auth` | `String` | Material de cifrado de `PushSubscription.toJSON().keys`, necesario para firmar cada payload |
| `userAgent` | `String?` | Procedencia best-effort para la UI de ajustes; no se usa para entregar |
| `createdAt` | `DateTime @default(now())` | |
| `lastActiveAt` | `DateTime @default(now())` | Se refresca en cada envío exitoso; habilita una poda futura de endpoints obsoletos |

Índice: `@@index([professionalId])` — la entrega carga todas las suscripciones de
un profesional. Web Push es un canal de entrega best-effort de la fila
`Notification`, nunca la fuente de verdad: un push que falla (o un dispositivo
offline) deja la fila legible desde `GET /notifications`.

## TrialEvent

Historial de auditoría, solo inserción, de las acciones de Super Admin sobre
el período de prueba. Ver [Panel de Administrador › Período de prueba](/features/admin-panel/#período-de-prueba).
El vencimiento natural no escribe fila: se deriva de `Professional.trialEndsAt`.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK → `Professional`, `onDelete: Cascade` |
| `action` | `TrialEventAction` | `GRANTED` \| `EXTENDED` \| `ENDED` |
| `actorId` / `actorEmail` | `String` | Quién lo hizo. **Sin FK** a propósito: la auditoría sobrevive al borrado de la cuenta del actor |
| `previousEndsAt` | `DateTime?` | Fin de la prueba antes de la acción (`null` en la primera activación) |
| `endsAt` | `DateTime` | Fin de la prueba después de la acción |
| `note` | `String?` | Nota opcional del admin (≤ 200 caracteres) |
| `createdAt` | `DateTime @default(now())` | Cuándo |

Índice: `@@index([professionalId, createdAt(sort: Desc)])` para el historial de una cuenta.

## ProfessionalActivityEvent

Actividad de producto de un profesional («¿cómo usa Agendya?»), solo inserción.
No es auditoría: `AuditLog` registra lo que hace el **equipo del Backoffice**;
esta tabla registra acciones del profesional, de sus clientes o del sistema.
La escribe `apps/api` después de confirmar cada cambio (best-effort: si falla, se
registra en el log y la acción del usuario no se ve afectada) y solo la lee
`apps/backoffice-api`. Ver [Actividad de profesionales](/features/professional-activity/).

| Campo | Tipo | Notas |
| --- | --- | --- |
| `professionalId` | `String` | FK → `Professional`, `onDelete: Cascade` |
| `type` | `ActivityEventType` | Cuenta, inicio de sesión, visita diaria, perfil, servicios, horario, fechas bloqueadas, ciclo de la cita (incluida la reprogramación) y push |
| `category` | `ActivityCategory` | Siempre `ACTIVITY_EVENT_CATEGORY[type]` (`@agendya/types`); se guarda para filtrar por índice |
| `actor` | `ActivityActor` | `PROFESSIONAL` \| `CUSTOMER` \| `SYSTEM` |
| `entityType` / `entityId` | `String?` | Referencia polimórfica (`Booking`, `Service`, …), **sin FK** para sobrevivir a borrados |
| `subject` | `String?` | Nombre de la entidad en ese momento (servicio, fecha); lo usa la búsqueda |
| `metadata` | `Json?` | Contexto seguro: nunca datos de contacto del cliente, contraseñas, tokens ni datos OAuth |
| `backfilled` | `Boolean` | `true` si la migración lo reconstruyó a partir de timestamps existentes |
| `dedupeKey` | `String? @unique` | Idempotencia de `DASHBOARD_VISITED` (una por profesional y día local) |
| `occurredAt` | `DateTime @default(now())` | Cuándo |

Índices: `(professionalId, occurredAt DESC)` para la línea de tiempo,
`(professionalId, category, occurredAt DESC)` para el filtro por categoría y
`(entityType, entityId)` para el historial de una cita o servicio.
