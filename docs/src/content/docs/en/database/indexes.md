---
title: Indexes & constraints
description: >-
  Every explicit index and constraint in the schema, and the query each one
  serves.
---

The index set was deliberately tuned (migration
`20260907120000_optimize_booking_indexes`). The reasoning is captured in
schema comments and reproduced here.

## Unique constraints

| Model | Constraint | Purpose |
| --- | --- | --- |
| `Professional` | `email @unique` | Login identity; also serves equality lookup |
| `Professional` | `slug @unique` | Public URL resolution (`findFirst({ slug, isActive })`) |
| `Professional` | `googleId @unique` | OAuth account linking |
| `Booking` | `cancellationToken @unique` | Public token routes (`/public/bookings/:token`) |
| `ScheduleException` | `@@unique([professionalId, date])` | One block per calendar day; Prisma `P2002` → `409 "Ya existe un bloqueo para esa fecha."` |

:::note
`slug` and `googleId` are already `@unique`; the constraint's btree index fully
serves equality and sort, so **no secondary `@@index` is added** for them.
:::

## Secondary indexes

### Service

| Index | Serves |
| --- | --- |
| `@@index([professionalId, isActive])` | Public page — active services for a professional |
| `@@index([professionalId, deletedAt])` | Dashboard list & plan-limit counts — non-deleted services for a professional |

### WorkingHour

| Index | Serves |
| --- | --- |
| `@@index([professionalId, dayOfWeek])` | Availability + `assertSlotWithinSchedule` — this professional's blocks for one weekday |

### Booking

| Index | Serves |
| --- | --- |
| `@@index([professionalId, startAt])` | Agenda list — a professional's bookings in a date range, any status |
| `@@index([professionalId, status, startAt])` | Availability & the serializable overlap guard — `status = CONFIRMED` equality + `startAt` range, bounded to live bookings instead of walking every past row |
| `@@index([status, startAt])` | Global cron sweeps — `RemindersScheduler` window queries and `ExpirationScheduler`'s `updateMany`, with no professional filter |
| `@@index([serviceId])` | FK column (Postgres does **not** auto-index FKs) — guards the `SetNull` path and "bookings for this service" lookups from a full scan |

### Notification

| Index | Serves |
| --- | --- |
| `@@index([professionalId, createdAt(sort: Desc)])` | The notification centre's only list query — `WHERE professionalId = ? ORDER BY createdAt DESC`, keyset-paginated over `(createdAt, id)`. Descending so the `ORDER BY` is a forward index scan |
| `@@index([professionalId, readAt])` | Unread badge — `WHERE professionalId = ? AND readAt IS NULL`. Prisma has no declarative partial index; this composite still bounds the count to one professional's rows |

## Constraint enforcement that lives in code, not the DB

Some invariants are enforced by the application layer rather than a DB
constraint:

| Invariant | Enforced by |
| --- | --- |
| No two `CONFIRMED` bookings overlap for a professional | `Serializable` transaction + explicit overlap `findFirst` in `commitBookingSlot` / `commitReschedule`, retried on serialization failure (`40001` / Prisma `P2034`) |
| Working-hour blocks for a day don't overlap | `setWorkingHoursSchema.superRefine` (Zod), before the DB write |
| At-home booking requires an address and an at-home-enabled service | `BookingsService.resolveServiceSelection` |
| Service count within plan limit | `ServicesService.assertWithinPlanLimit` (`PLAN_SERVICE_LIMITS`) |
| `endMinute > startMinute` | `workingHourEntrySchema.refine` (Zod) |

:::tip[Audit trail]
A database-architecture audit (Sept 2026, see the repo's local memory)
concluded the schema is sound for Phase 1. Deferred with rationale: a
`Customer` entity, multi-service line-item rows (currently modelled via the
combined snapshot), a native `uuid` column type, and table partitioning.
:::
