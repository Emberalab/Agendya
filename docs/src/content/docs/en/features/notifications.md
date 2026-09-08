---
title: Notifications
description: Transactional emails, the reminder cron, and the expiration sweep.
---

All notifications are **email**, sent through `MailService`
(`infra/mail/mail.service.ts`) via **Resend**. No SMS, no push, no in-app
notifications.

## Email catalogue

| Method | Trigger | Recipient | Subject (es-CO) |
| --- | --- | --- | --- |
| `sendBookingConfirmation` | Booking created; also on token-edit when the time didn't change | Customer | `Reserva confirmada con <business>` |
| `sendBookingReminder` | Reminder cron, 24h and 2h before `startAt` | Customer | `Recordatorio: tu cita con <business>` |
| `sendBookingRescheduled` | Any reschedule / time-changing edit | Customer | `Cita modificada con <business>` |
| `sendBookingRescheduledToProfessional` | Customer-initiated reschedule / edit | Professional | `Modificación de reserva - <customer>` |
| `sendBookingCancelled` | Cancel by customer or professional | Customer | `Reserva cancelada con <business>` |

- **From:** `Agendya <reservas@agendya.app>` (hard-coded).
- **Dates:** `Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle:
  'short', timeZone })` in the professional's timezone.
- **Cancel link:** `{WEB_URL}/bookings/<cancellationToken>`.
- **XSS:** every interpolated value (`customerName`, `businessName`,
  `serviceName`, …) passes through `escapeHtml` — the booking form is public
  and the professional receives some of those values in their inbox.
- **Unconfigured:** no `RESEND_API_KEY` → `send()` logs
  `[dev] Email a <to>: <subject>` and returns. A Resend API error when
  configured is caught and logged, never thrown, so email never breaks a
  booking response.

## Reminder scheduler

`modules/bookings/reminders.scheduler.ts` — two `@Cron('*/15 * * * *')` jobs
(24h and 2h).

```mermaid
flowchart TB
  T["every 15 min"] --> G{"DISABLE_SCHEDULED_JOBS === 'true'?"}
  G -->|yes| stop["return"]
  G -->|no| W["windowStart = now + Nh · windowEnd = windowStart + 15 min"]
  W --> Q["booking.findMany:<br/>status CONFIRMED · reminderNhSentAt IS NULL · startAt ∈ [windowStart, windowEnd)"]
  Q --> L["for each: sendBookingReminder(...)"]
  L --> U["set reminderNhSentAt = now  (idempotency marker)"]
  L -->|send throws| E["logger.error, leave marker null → retried next tick"]
```

Because the marker is only written **after** a successful send, a failed send
is retried on the next run; a successful one is never re-sent. The
15-minute window matches the cron cadence so each booking falls in exactly one
window.

## Expiration scheduler

`modules/bookings/expiration.scheduler.ts` — one `@Cron('*/15 * * * *')`.

```mermaid
flowchart LR
  T["every 15 min"] --> G{"DISABLE_SCHEDULED_JOBS?"}
  G -->|yes| stop["return"]
  G -->|no| U["booking.updateMany({ status: CONFIRMED, startAt < now }, { status: EXPIRED })"]
  U --> Lg["log count if > 0"]
```

This is a **backstop for the agenda view**, not the enforcement mechanism:
every mutating endpoint already revalidates `startAt` against `Date.now()` and
self-heals the row it touches (`assertModifiable`), so a booking can never be
rescheduled merely because this sweep hasn't run.

## Not implemented

- No reminder to the **professional**.
- No cancellation email to the professional (only the customer is emailed on
  cancel).
- No `NO_SHOW` flow, so no related notification.
- No digest / daily-summary email.
