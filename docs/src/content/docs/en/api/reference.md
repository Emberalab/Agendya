---
title: Endpoint reference
description: Every REST endpoint in apps/api — method, path, auth, payload and response.
---

Auth column: **none** = public · **JWT** = `Authorization: Bearer` · **token** =
public but scoped by a URL `cancellationToken` · **state** = OAuth `state`
cookie. Schemas in parentheses live in `@agendya/types`.

## Health

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| `GET` | `/` | none | `"Agendya API"` (text) |
| `GET` | `/health` | none | `{ "status": "ok", "timestamp": "<ISO>" }` |

## Auth — `modules/auth`

| Method | Path | Auth | Body / Query | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | none · 5/60s | `{ email, password (8–72), businessName (2–100) }` (`registerSchema`) | `201` `{ accessToken, user }` |
| `POST` | `/auth/login` | none · 5/60s | `{ email, password }` (`loginSchema`) | `200` `{ accessToken, user }` |
| `GET` | `/auth/me` | JWT | — | `{ id, email, businessName, slug }` |
| `GET` | `/auth/google` | none | — | `302` → Google (sets `oauth_state` cookie) |
| `GET` | `/auth/google/callback` | state + Google | `?code&state` | `302` → `{WEB_URL}/auth/callback#token=<JWT>` |

`user` = `{ id, email, businessName, slug }`.

## Professionals — `modules/professionals`

| Method | Path | Auth | Body / Query | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/professionals/me` | JWT | — | `ProfessionalProfile` (+ `bookingsThisMonth`, `monthlyBookingLimit`) |
| `PATCH` | `/professionals/me` | JWT | partial (`updateProfileSchema`) | `ProfessionalProfile` |
| `GET` | `/professionals/check-slug` | JWT | `?slug` (`checkSlugQuerySchema`) | `{ available: boolean }` |
| `GET` | `/public/professionals/:slug` | none · 30/60s | — | `PublicProfessional` (profile + active services) |

## Services — `modules/services` (all JWT)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/services` | — | `Service[]` (non-deleted, `sortOrder` asc) |
| `POST` | `/services` | `createServiceSchema` | `Service` — `403` if over plan limit |
| `PATCH` | `/services/:id` | `updateServiceSchema` (partial) | `Service` — `404` if not owned |
| `POST` | `/services/:id/duplicate` | — | `Service` (`"<name> (copia)"`) — `403` if over limit |
| `DELETE` | `/services/:id` | — | `Service` (soft-deleted: `deletedAt` set, `isActive=false`) |

## Schedules — `modules/schedules` (all JWT)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/schedules/working-hours` | — | `WorkingHour[]` |
| `PUT` | `/schedules/working-hours` | `{ days: [{ dayOfWeek, startMinute, endMinute }] }` (`setWorkingHoursSchema`) | `WorkingHour[]` — **replaces the whole week** |
| `GET` | `/schedules/exceptions` | — | `ScheduleException[]` (`date` asc) |
| `POST` | `/schedules/exceptions` | `{ date: "YYYY-MM-DD", reason? }` (`createScheduleExceptionSchema`) | `ScheduleException` — `409` on duplicate date |
| `DELETE` | `/schedules/exceptions/:id` | — | `200` empty — `404` if not owned |

## Availability — `modules/schedules`

| Method | Path | Auth | Query | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/public/professionals/:slug/availability` | none · 30/60s | `serviceIds` (csv), `date` (`YYYY-MM-DD`), `atHome` (`"true"`/`"false"`) — `availabilityQuerySchema` | `{ slots: string[] }` (ISO start instants) |

## Bookings — professional — `modules/bookings` (all JWT)

| Method | Path | Body / Query | Response |
| --- | --- | --- | --- |
| `GET` | `/bookings` | `?from&to` (`YYYY-MM-DD`, `agendaQuerySchema`) | `AgendaBooking[]` (all statuses, `startAt` asc) |
| `PATCH` | `/bookings/:id/cancel` | — | `AgendaBooking` (`CANCELLED`, `cancelledBy: "professional"`) |
| `PATCH` | `/bookings/:id/complete` | — | `AgendaBooking` (`COMPLETED`) — `409` unless `CONFIRMED`/`EXPIRED` |
| `PATCH` | `/bookings/:id/reschedule` | `{ newStartAt: "<ISO>" }` (`rescheduleBookingSchema`) | `AgendaBooking` |

## Bookings — public — `modules/bookings`

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/public/professionals/:slug/bookings` | none · 10/60s | `createBookingSchema` | `PublicBooking` (`CONFIRMED`) |
| `GET` | `/public/bookings/:token` | token · 30/60s | — | `PublicBooking` |
| `PATCH` | `/public/bookings/:token` | token · 10/60s | `updateBookingSchema` (= create shape) | `PublicBooking` (edit in place) |
| `POST` | `/public/bookings/:token/cancel` | token · 10/60s | — | `PublicBooking` (`CANCELLED`, `cancelledBy: "customer"`) |
| `POST` | `/public/bookings/:token/reschedule` | token · 10/60s | `{ newStartAt }` | `PublicBooking` |

## Upload — `infra/upload`

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/upload/image` | JWT | `multipart/form-data` field `file`; `?type=logo\|cover` (default `logo`) | `{ url: "<cloudinary secure_url>" }` |

Accepts `image/png\|jpeg\|webp\|gif` only (**no SVG**). Size caps: logo 6 MB,
cover 12 MB, hard limit 15 MB. `503` if `CLOUDINARY_URL` is unset.

## Request/response examples

### Create a booking

```http
POST /public/professionals/barberia-central/bookings HTTP/1.1
Content-Type: application/json

{
  "serviceIds": "b3f1…,c7a2…",
  "startAt": "2026-09-10T14:00:00.000Z",
  "customerName": "Ana Ruiz",
  "customerEmail": "ana@example.com",
  "customerPhone": "+57 300 1234567",
  "atHome": false
}
```

```jsonc
// 201 Created
{
  "id": "…", "businessName": "Barbería Central", "professionalSlug": "barberia-central",
  "serviceId": "b3f1…", "serviceName": "Corte + Barba", "durationMinutes": 45,
  "customerName": "Ana Ruiz", "customerEmail": "ana@example.com", "customerPhone": "+57 300 1234567",
  "customerNote": null, "atHome": false, "customerAddress": null,
  "startAt": "2026-09-10T14:00:00.000Z", "endAt": "2026-09-10T14:45:00.000Z",
  "status": "CONFIRMED", "cancellationToken": "9d2c…",
  "cancellationPolicyHours": 24, "canCancel": true, "canReschedule": true
}
```

### Authenticated request

```http
GET /bookings?from=2026-09-07&to=2026-09-14 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs…
```

See [Error handling](/en/api/errors/) for failure responses.
