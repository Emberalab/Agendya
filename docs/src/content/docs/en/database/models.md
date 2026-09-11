---
title: Prisma models
description: Field-by-field reference for each model in schema.prisma.
---

All models use `id String @id @default(uuid())`, `createdAt DateTime
@default(now())`, and (except `ScheduleException`) `updatedAt DateTime
@updatedAt`.

## Professional

The barber/stylist account.

| Field | Type | Notes |
| --- | --- | --- |
| `email` | `String @unique` | Login identity |
| `passwordHash` | `String?` | bcrypt hash; `null` for Google-only accounts |
| `googleId` | `String? @unique` | Set when linked to a Google account |
| `businessName` | `String` | Display name; also seeds the slug |
| `slug` | `String @unique` | Public booking URL segment (`/:slug`) |
| `category` | `String?` | e.g. "Barbería" |
| `photoUrl` / `logoUrl` / `coverImageUrl` | `String?` | http(s) URLs (Cloudinary in practice) |
| `brandColor` | `String? @default("#4F46E5")` | 6-digit hex |
| `description` | `String?` | Free text, ≤ 500 chars (schema-enforced in Zod) |
| `timezone` | `String @default("America/Bogota")` | IANA zone |
| `cancellationPolicyHours` | `Int @default(24)` | Minimum notice for customer changes; UI restricts to `1,2,3,4,6,24` |
| `plan` | `Plan @default(BASIC)` | `BASIC` \| `PRO` |
| `isActive` | `Boolean @default(true)` | `JwtStrategy` rejects tokens for inactive accounts |

Relations: `services`, `workingHours`, `scheduleExceptions`, `bookings`
(all `[]`).

## Service

An offering.

| Field | Type | Notes |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `name` | `String` | 2–100 chars |
| `description` | `String?` | ≤ 500 chars |
| `durationMinutes` | `Int` | In-shop duration; UI offers a fixed option list, Zod bounds `5–480` |
| `priceCents` | `Int @default(0)` | Integer minor units, `0 … 100_000_000` |
| `isActive` | `Boolean @default(true)` | Hidden from the public page when `false` |
| `homeServiceEnabled` | `Boolean @default(false)` | At-home variant toggle |
| `homeDurationMinutes` | `Int?` | Required (Zod) when `homeServiceEnabled` |
| `homePriceCents` | `Int?` | Required (Zod) when `homeServiceEnabled` |
| `sortOrder` | `Int @default(0)` | Ascending display order; set to current count on create |
| `deletedAt` | `DateTime?` | Soft-delete tombstone; all queries filter `deletedAt: null` |

## WorkingHour

One weekly recurring block. A weekday may have **several** rows (up to 6,
non-overlapping — enforced in `setWorkingHoursSchema`).

| Field | Type | Notes |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `dayOfWeek` | `Weekday` | Enum |
| `startMinute` | `Int` | Minutes from midnight, `0–1439` |
| `endMinute` | `Int` | Minutes from midnight, `1–1440`, must be `> startMinute` |

`setWorkingHours` replaces the whole set per professional inside one
transaction (`deleteMany` + `createMany`).

## ScheduleException

A one-off closed date. No `updatedAt`.

| Field | Type | Notes |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `date` | `DateTime @db.Date` | Date-only column; stored as the UTC midnight of that calendar day |
| `reason` | `String?` | Optional label |
| | | `@@unique([professionalId, date])` — one exception per day; violation → `409` |

## Booking

A customer appointment.

| Field | Type | Notes |
| --- | --- | --- |
| `professionalId` | `String` | FK, `onDelete: Cascade` |
| `serviceId` | `String?` | FK, `onDelete: SetNull` — nulled if the service is deleted |
| `serviceNameSnapshot` | `String` | Combined name at booking time (`"Corte + Barba"` for multi-service) |
| `durationMinutesSnapshot` | `Int` | Total duration at booking time; drives `endAt` and reschedule maths |
| `customerName` / `customerEmail` / `customerPhone` | `String` | Captured on the public form; no account |
| `customerNote` | `String?` | Optional, ≤ 500 chars, trimmed |
| `atHome` | `Boolean @default(false)` | At-home booking |
| `customerAddress` | `String?` | Required when `atHome` (service-level check) |
| `startAt` / `endAt` | `DateTime` | Absolute instants (UTC) |
| `status` | `BookingStatus @default(CONFIRMED)` | See the [lifecycle](/en/database/appointment-lifecycle/) |
| `cancellationToken` | `String @unique @default(uuid())` | Powers the public cancel/reschedule/edit links (`/bookings/:token`) |
| `cancelledAt` | `DateTime?` | Set on cancel |
| `cancelledBy` | `String?` | `"customer"` or `"professional"` |
| `reminder24hSentAt` / `reminder2hSentAt` | `DateTime?` | Idempotency markers for `RemindersScheduler` |

:::note[`PENDING` is unused in Phase 1]
The enum keeps `PENDING` (and `NO_SHOW`) but no current code path creates a
`PENDING` booking or sets `NO_SHOW`. New bookings are `CONFIRMED` immediately.
:::

## Notification

An entry in a professional's persistent **notification centre** (see
[Notifications](/en/features/notifications/#notification-centre)). The row is the
source of truth; SSE and a future Web Push are delivery channels.

| Field | Type | Notes |
| --- | --- | --- |
| `professionalId` | `String` | FK → `Professional`, `onDelete: Cascade` |
| `type` | `NotificationType` | Today only `APPOINTMENT_CREATED`. The enum reserves `APPOINTMENT_CANCELLED` / `APPOINTMENT_RESCHEDULED` / `APPOINTMENT_REMINDER` / `SYSTEM` for later |
| `title` / `body` | `String` | Ready-to-render strings (es-CO). Also usable as a Web Push payload |
| `data` | `Json` | `{ bookingId, customerName, serviceName, startAt }` — `bookingId` is the navigation reference; the other fields avoid a join and are point-in-time |
| `readAt` | `DateTime?` | `null` while unread |
| `createdAt` | `DateTime @default(now())` | |

`customerEmail` / `customerPhone` / `customerAddress` / `customerNote` and the
`cancellationToken` are not copied in.

:::note[Retention]
No automatic deletion. Future strategy: a daily `@Cron` removing read rows older
than ~90 days, plus a per-professional cap. See
[Notifications › Retention](/en/features/notifications/#retention).
:::
