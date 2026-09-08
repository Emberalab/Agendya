---
title: Entity-relationship model
description: >-
  The five entities in the Agendya Phase 1 schema and how they relate, straight
  from apps/api/prisma/schema.prisma.
---

Source: `apps/api/prisma/schema.prisma`. Provider PostgreSQL, all primary keys
`String @id @default(uuid())`.

```mermaid
erDiagram
  Professional ||--o{ Service : "has"
  Professional ||--o{ WorkingHour : "has"
  Professional ||--o{ ScheduleException : "has"
  Professional ||--o{ Booking : "receives"
  Service ||--o{ Booking : "booked as (nullable)"

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
    enum plan "BASIC | PRO, default BASIC"
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
    datetime deletedAt "nullable — soft delete"
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
    string cancelledBy "nullable — 'customer' | 'professional'"
    datetime reminder24hSentAt "nullable"
    datetime reminder2hSentAt "nullable"
    datetime createdAt
    datetime updatedAt
  }
```

## Relationships & cascade rules

| From | To | Cardinality | `onDelete` |
| --- | --- | --- | --- |
| `Service.professional` | `Professional` | many-to-one | `Cascade` — delete a professional, delete their services |
| `WorkingHour.professional` | `Professional` | many-to-one | `Cascade` |
| `ScheduleException.professional` | `Professional` | many-to-one | `Cascade` |
| `Booking.professional` | `Professional` | many-to-one | `Cascade` |
| `Booking.service` | `Service` | many-to-one, **optional** | `SetNull` — deleting a service keeps its bookings; `serviceId` becomes `null`, and `serviceNameSnapshot` / `durationMinutesSnapshot` preserve what was booked |

## Enums

| Enum | Values |
| --- | --- |
| `Weekday` | `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY` |
| `BookingStatus` | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, `EXPIRED` |
| `Plan` | `BASIC`, `PRO` |

## Design notes

- **No `Customer` table.** Customer identity is three fields
  (`customerName` / `customerEmail` / `customerPhone`) captured per booking.
  A `Customer` entity is explicitly deferred past Phase 1.
- **Snapshots on `Booking`.** `serviceNameSnapshot` and
  `durationMinutesSnapshot` freeze what the customer booked, so later edits to
  (or deletion of) the `Service` don't rewrite history.
- **Soft delete on `Service`** via `deletedAt`; queries filter `deletedAt:
  null`. Hard delete is never issued from application code.
- **Money** is integer minor units (`priceCents`, `homePriceCents`) — no
  floats. Range `0 … 100_000_000`.
- **Time of day** is "minutes from midnight" integers on `WorkingHour`
  (`0–1439` start, `1–1440` end).

See [Prisma models](/en/database/models/) for field-level detail and
[Indexes & constraints](/en/database/indexes/) for the index strategy.
