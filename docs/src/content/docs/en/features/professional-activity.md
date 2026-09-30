---
title: Professional activity (Backoffice)
description: >-
  Internal panel to understand, from real data, how a professional used
  Agendya during their 30-day trial.
---

The Backoffice (`apps/backoffice-web`, "Pruebas" and "Ver actividad" on a
professional's 360° view) shows what an account did during its
[trial](/en/features/admin-panel/#trial-period). Facts only: there is no "engagement score".

## Three separate layers

| Question | Source |
| --- | --- |
| What did internal staff do? | `AuditLog` (unchanged; now also records `SUPPORT_VIEWED_PROFESSIONAL_ACTIVITY`) |
| How does the professional use Agendya? | [`ProfessionalActivityEvent`](/en/database/models/#professionalactivityevent) |
| What happened in their business? | Computed on the fly from `Booking`, `Service`, `WorkingHour`, `ScheduleException`, `Notification`, `PushSubscription` and `SupportTicket` — no stored counters |

## What is recorded

`apps/api` (`modules/activity/activity.service.ts`) writes an event after each
persisted action: account creation, login, password reset, one dashboard visit
per day (on `GET /professionals/me`), profile changes, services (create, edit
with before/after, delete), weekly working-hours saves (before/after), blocked
and unblocked dates, appointments (created online or manually, edited,
**rescheduled** with old and new time, cancelled, completed) and push
enabled/disabled.

Nothing about the customer (name, email, phone, address, note) and no
credentials are stored. Descriptions and images are only flagged as "updated".
A rejected action leaves no event.

When the table was introduced, the migration reconstructed what existing data
can prove (accounts, services created/deleted, current working hours, current
blocked dates, bookings created/cancelled, push devices), flagged `backfilled`
and shown as "reconstruido". Earlier reschedules, edits, logins and visits
**do not exist** and are not invented.

## API (`apps/backoffice-api`)

All routes require an internal token (`InternalJwtAuthGuard`, Backoffice
audience) and the `VIEW` permission (any internal role). There is no equivalent
route in `apps/api`.

| Route | Returns |
| --- | --- |
| `GET /backoffice/trials?status=ACTIVE\|ENDED\|ALL` | Accounts with a trial, last activity and bookings created during the trial |
| `GET /backoffice/professionals/:id/activity` | Cursor-paginated timeline. Filters: `trialOnly`, `from`, `to`, `category`, `type`, `actor`, `entityId`, `search`, `order` |
| `GET /backoffice/professionals/:id/activity/summary` | Trial overview, appointments, customers, configuration, usage, engagement, first steps and daily activity. Written to `AuditLog` |

"In period" metrics use the trial window (start → end, or until now while
active); without a trial, the last 30 days. "Active days" counts days (in the
professional's time zone) with at least one own action. "Distinct customers" is
counted by booking phone number.
