---
title: Modelo entidad-relación
description: >-
  Las cinco entidades del esquema de la Fase 1 de Agendya y cómo se relacionan,
  directo de apps/api/prisma/schema.prisma.
---

Fuente: `apps/api/prisma/schema.prisma`. Provider PostgreSQL, todas las claves
primarias `String @id @default(uuid())`.

```mermaid
erDiagram
  Professional ||--o{ Service : "tiene"
  Professional ||--o{ WorkingHour : "tiene"
  Professional ||--o{ ScheduleException : "tiene"
  Professional ||--o{ Booking : "recibe"
  Professional ||--o{ Notification : "recibe avisos"
  Professional ||--o{ PushSubscription : "registra dispositivos"
  Service ||--o{ Booking : "reservado como (nullable)"

  Professional {
    string id PK
    string email UK
    string passwordHash "nullable"
    string googleId UK "nullable"
    string businessName
    string slug UK
    string category "nullable"
    string photoUrl "nullable"
    string logoUrl "nullable"
    string coverImageUrl "nullable"
    string brandColor "default #4F46E5"
    string description "nullable"
    string timezone "default America/Bogota"
    int cancellationPolicyHours "default 24"
    enum plan "FREE | BASIC | ADVANCED | BUSINESS, default FREE"
    enum billingInterval "monthly | annual, nullable"
    datetime planStartedAt "nullable"
    datetime planExpiresAt "nullable"
    string lastWompiTransactionId UK "nullable"
    boolean isActive "default true"
    datetime createdAt
    datetime updatedAt
  }

  Service {
    string id PK
    string professionalId FK
    string name
    string description "nullable"
    int durationMinutes
    int priceCents "default 0"
    boolean isActive "default true"
    boolean homeServiceEnabled "default false"
    int homeDurationMinutes "nullable"
    int homePriceCents "nullable"
    int sortOrder "default 0"
    datetime deletedAt "nullable — borrado logico"
    datetime createdAt
    datetime updatedAt
  }

  WorkingHour {
    string id PK
    string professionalId FK
    enum dayOfWeek "Weekday"
    int startMinute "0-1439"
    int endMinute "1-1440"
    datetime createdAt
    datetime updatedAt
  }

  ScheduleException {
    string id PK
    string professionalId FK
    date date "@db.Date"
    string reason "nullable"
    datetime createdAt
  }

  Booking {
    string id PK
    string professionalId FK
    string serviceId FK "nullable — onDelete SetNull"
    string serviceNameSnapshot
    int durationMinutesSnapshot
    string customerName
    string customerEmail
    string customerPhone
    string customerNote "nullable"
    boolean atHome "default false"
    string customerAddress "nullable"
    datetime startAt
    datetime endAt
    enum status "BookingStatus, default CONFIRMED"
    string cancellationToken UK "default uuid()"
    datetime cancelledAt "nullable"
    string cancelledBy "nullable — customer | professional"
    datetime reminder24hSentAt "nullable"
    datetime reminder2hSentAt "nullable"
    datetime createdAt
    datetime updatedAt
  }

  Notification {
    string id PK
    string professionalId FK
    enum type "NotificationType"
    string title
    string body
    json data "{ bookingId, customerName, serviceName, startAt }"
    datetime readAt "nullable — null = sin leer"
    datetime createdAt
  }

  PushSubscription {
    string id PK
    string professionalId FK
    string endpoint "unique — URL del servicio de push"
    string p256dh
    string auth
    string userAgent "nullable"
    datetime createdAt
    datetime lastActiveAt
  }
```

## Relaciones y reglas de cascada

| Desde | Hacia | Cardinalidad | `onDelete` |
| --- | --- | --- | --- |
| `Service.professional` | `Professional` | muchos a uno | `Cascade` — al borrar un profesional, se borran sus servicios |
| `WorkingHour.professional` | `Professional` | muchos a uno | `Cascade` |
| `ScheduleException.professional` | `Professional` | muchos a uno | `Cascade` |
| `Booking.professional` | `Professional` | muchos a uno | `Cascade` |
| `Notification.professional` | `Professional` | muchos a uno | `Cascade` |
| `PushSubscription.professional` | `Professional` | muchos a uno | `Cascade` |
| `Booking.service` | `Service` | muchos a uno, **opcional** | `SetNull` — al borrar un servicio se conservan sus reservas; `serviceId` pasa a `null`, y `serviceNameSnapshot` / `durationMinutesSnapshot` preservan lo que se reservó |

## Enums

| Enum | Valores |
| --- | --- |
| `Weekday` | `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY` |
| `BookingStatus` | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, `EXPIRED` |
| `Plan` | `FREE`, `BASIC`, `ADVANCED`, `BUSINESS` |
| `NotificationType` | `APPOINTMENT_CREATED` (único emitido hoy; el enum se ampliará) |

## Notas de diseño

- **Sin tabla `Customer`.** La identidad del cliente son tres campos
  (`customerName` / `customerEmail` / `customerPhone`) capturados por reserva.
  Una entidad `Customer` está explícitamente diferida más allá de la Fase 1.
- **Snapshots en `Booking`.** `serviceNameSnapshot` y
  `durationMinutesSnapshot` congelan lo que reservó el cliente, para que
  ediciones posteriores (o el borrado) del `Service` no reescriban el
  histórico.
- **Borrado lógico en `Service`** vía `deletedAt`; las consultas filtran
  `deletedAt: null`. El código de aplicación nunca emite un borrado físico.
- **El dinero** son unidades menores enteras (`priceCents`, `homePriceCents`) —
  sin flotantes. Rango `0 … 100_000_000`.
- **La hora del día** son enteros de «minutos desde medianoche» en
  `WorkingHour` (`0–1439` inicio, `1–1440` fin).

Ver [Modelos de Prisma](/database/models/) para el detalle a nivel de campo y
[Índices y restricciones](/database/indexes/) para la estrategia de índices.
