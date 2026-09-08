---
title: Data flow
description: >-
  Two worked end-to-end examples — a customer creating a booking, and a
  professional loading their agenda.
---

## Example 1 — a customer creates a booking

```mermaid
sequenceDiagram
  autonumber
  actor C as Customer (browser)
  participant W as BookingWizard (React)
  participant H as useCreateBooking (TanStack Query)
  participant AC as apiClient
  participant Ctl as BookingsCreateController
  participant Zod as ZodValidationPipe(createBookingSchema)
  participant Svc as BookingsService
  participant DB as PostgreSQL (Prisma)
  participant M as MailService (Resend)

  C->>W: pick services, date, slot, contact details
  W->>H: mutate(CreateBookingInput)
  H->>AC: createPublicBooking(slug, input)
  AC->>Ctl: POST /public/professionals/:slug/bookings
  Note over Ctl: @Throttle 10 / 60s
  Ctl->>Zod: validate body
  Zod-->>Ctl: parsed input  (400 on failure)
  Ctl->>Svc: createPublicBooking(slug, input)
  Svc->>DB: find active professional by slug  (404 if none)
  Svc->>DB: resolve services, sum duration, apply at-home rules
  Svc->>Svc: reject if startAt in the past
  Svc->>DB: assertSlotWithinSchedule (working hours + exception)
  Svc->>DB: SERIALIZABLE tx: overlap check → INSERT booking (retry x3 on 40001/P2034)
  DB-->>Svc: Booking (status CONFIRMED, cancellationToken)
  Svc->>M: sendBookingConfirmation(...)  (logs if unconfigured)
  Svc-->>Ctl: PublicBooking DTO
  Ctl-->>AC: 201 JSON
  AC-->>H: { data }
  H-->>W: onSuccess → show BookingConfirmedView
```

Key points:

- **Validation happens twice on purpose** — the wizard validates with the Zod
  schema for UX, the API re-validates the same schema for trust.
- **The slot guard is server-authoritative.** The availability list the wizard
  showed can be stale; `assertSlotWithinSchedule` + the serializable overlap
  check are what actually prevent a double-booking.
- **Email never blocks the response on failure** — `MailService.send` catches
  and logs.
- New bookings are created `CONFIRMED` (`@default(CONFIRMED)` on the model).
  `PENDING` exists in the enum but no current flow assigns it.

## Example 2 — a professional loads the agenda

```mermaid
sequenceDiagram
  autonumber
  actor P as Professional (browser)
  participant AP as AgendaPage
  participant H as useAgenda
  participant AC as apiClient
  participant G as JwtAuthGuard → JwtStrategy
  participant Ctl as BookingsController
  participant Svc as BookingsService
  participant DB as PostgreSQL

  P->>AP: open /dashboard/agenda (date range)
  AP->>H: useQuery(['agenda', from, to])
  H->>AC: listAgenda(from, to)
  AC->>Ctl: GET /bookings?from=…&to=…  (Authorization: Bearer <JWT>)
  Ctl->>G: validate token
  G->>DB: professional.findUnique(sub)  → check isActive
  G-->>Ctl: request.user = Professional
  Ctl->>Svc: listAgenda(user.id, from, to)
  Svc->>DB: professional.findUniqueOrThrow (for timezone)
  Svc->>DB: booking.findMany({ professionalId, startAt in [zonedInstant(from,0), zonedInstant(to,24h)) }) ORDER BY startAt
  DB-->>Svc: rows
  Svc-->>Ctl: AgendaBooking[]  (canReschedule computed per row via booking-policy)
  Ctl-->>AC: 200 JSON
  AC-->>H: cache + render list
```

- The `from`/`to` query params are calendar dates (`YYYY-MM-DD`); the service
  turns them into absolute instants **in the professional's timezone** before
  querying.
- `canReschedule` / `canCancel` on each row are derived by the pure
  `booking-policy.ts` predicates, so the UI can disable buttons without a
  round-trip — but the mutation endpoints re-check the same rules.

## The generic shape

```
User → React → hook → api.ts → apiClient(+JWT)
     → Controller (guard, ZodValidationPipe)
     → Service (ownership + policy + tx)
     → Prisma → PostgreSQL
     → DTO mapper → JSON → cache → render
```
