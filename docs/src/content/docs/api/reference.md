---
title: Referencia de endpoints
description: Cada endpoint REST de apps/api — método, ruta, autenticación, payload y respuesta.
---

Columna Auth: **ninguna** = público · **JWT** = `Authorization: Bearer` ·
**token** = público pero acotado por un `cancellationToken` en la URL ·
**state** = cookie `state` de OAuth. Los esquemas entre paréntesis viven en
`@agendya/types`.

## Health

| Método | Ruta | Auth | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/` | ninguna | `"Agendya API"` (texto) |
| `GET` | `/health` | ninguna | `{ "status": "ok", "timestamp": "<ISO>" }` |

## Auth — `modules/auth`

| Método | Ruta | Auth | Cuerpo / Query | Respuesta |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | ninguna · 5/60s | `{ email, password (8–72), businessName (2–100) }` (`registerSchema`) | `201` `{ accessToken, user }` · `403 { code: "WAITLIST_REQUIRED" }` en Railway si el correo no está en la lista de prueba |
| `POST` | `/auth/login` | ninguna · 5/60s | `{ email, password }` (`loginSchema`) | `200` `{ accessToken, user }` · mismo `403` de lista de espera |
| `GET` | `/auth/me` | JWT | — | `{ id, email, businessName, slug }` |
| `GET` | `/auth/google` | ninguna | — | `302` → Google (pone la cookie `oauth_state`) |
| `GET` | `/auth/google/callback` | state + Google | `?code&state` | `302` → `{WEB_URL}/auth/callback#token=<JWT>` · correo no permitido: `{WEB_URL}/register?waitlist=1` · `state` inválido: `{WEB_URL}/login?error=oauth` |

`user` = `{ id, email, businessName, slug }`.

## Professionals — `modules/professionals`

| Método | Ruta | Auth | Cuerpo / Query | Respuesta |
| --- | --- | --- | --- | --- |
| `GET` | `/professionals/me` | JWT | — | `ProfessionalProfile` (+ `bookingsThisMonth`, `monthlyBookingLimit`) |
| `PATCH` | `/professionals/me` | JWT | parcial (`updateProfileSchema`) | `ProfessionalProfile` |
| `GET` | `/professionals/check-slug` | JWT | `?slug` (`checkSlugQuerySchema`) | `{ available: boolean }` |
| `GET` | `/public/professionals/:slug` | ninguna · 30/60s | — | `PublicProfessional` (perfil + servicios activos) |

## Services — `modules/services` (todos JWT)

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/services` | — | `Service[]` (no borrados, `sortOrder` asc) |
| `POST` | `/services` | `createServiceSchema` | `Service` — `403` si supera el límite del plan |
| `PATCH` | `/services/:id` | `updateServiceSchema` (parcial) | `Service` — `404` si no es propio |
| `POST` | `/services/:id/duplicate` | — | `Service` (`"<name> (copia)"`) — `403` si supera el límite |
| `DELETE` | `/services/:id` | — | `Service` (borrado lógico: `deletedAt` puesto, `isActive=false`) |

## Schedules — `modules/schedules` (todos JWT)

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/schedules/working-hours` | — | `WorkingHour[]` |
| `PUT` | `/schedules/working-hours` | `{ days: [{ dayOfWeek, startMinute, endMinute }] }` (`setWorkingHoursSchema`) | `WorkingHour[]` — **reemplaza la semana entera** |
| `GET` | `/schedules/exceptions` | — | `ScheduleException[]` (`date` asc) |
| `POST` | `/schedules/exceptions` | `{ date: "YYYY-MM-DD", reason? }` (`createScheduleExceptionSchema`) | `ScheduleException` — `409` si la fecha está duplicada |
| `DELETE` | `/schedules/exceptions/:id` | — | `200` vacío — `404` si no es propia |

## Availability — `modules/schedules`

| Método | Ruta | Auth | Query | Respuesta |
| --- | --- | --- | --- | --- |
| `GET` | `/public/professionals/:slug/availability` | ninguna · 30/60s | `serviceIds` (csv), `date` (`YYYY-MM-DD`), `atHome` (`"true"`/`"false"`) — `availabilityQuerySchema` | `{ slots: string[] }` (instantes de inicio ISO) |

## Bookings — profesional — `modules/bookings` (todos JWT)

| Método | Ruta | Cuerpo / Query | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/bookings` | `?from&to` (`YYYY-MM-DD`, `agendaQuerySchema`) | `AgendaBooking[]` (todos los estados, `startAt` asc) |
| `PATCH` | `/bookings/:id/cancel` | — | `AgendaBooking` (`CANCELLED`, `cancelledBy: "professional"`) |
| `PATCH` | `/bookings/:id/complete` | — | `AgendaBooking` (`COMPLETED`) — `409` salvo `CONFIRMED`/`EXPIRED` |
| `PATCH` | `/bookings/:id/reschedule` | `{ newStartAt: "<ISO>" }` (`rescheduleBookingSchema`) | `AgendaBooking` |

## Bookings — público — `modules/bookings`

| Método | Ruta | Auth | Cuerpo | Respuesta |
| --- | --- | --- | --- | --- |
| `POST` | `/public/professionals/:slug/bookings` | ninguna · 10/60s | `createBookingSchema` | `PublicBooking` (`CONFIRMED`) |
| `GET` | `/public/bookings/:token` | token · 30/60s | — | `PublicBooking` |
| `PATCH` | `/public/bookings/:token` | token · 10/60s | `updateBookingSchema` (= forma de crear) | `PublicBooking` (edición en el sitio) |
| `POST` | `/public/bookings/:token/cancel` | token · 10/60s | — | `PublicBooking` (`CANCELLED`, `cancelledBy: "customer"`) |
| `POST` | `/public/bookings/:token/reschedule` | token · 10/60s | `{ newStartAt }` | `PublicBooking` |

## Notifications — `modules/notifications` (todos JWT)

Feed persistente del profesional (ver [Notificaciones](/features/notifications/#centro-de-notificaciones)).
Todo se acota a `req.user.id` en el servidor; nunca se confía en un id del cliente.

| Método | Ruta | Query / Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/notifications` | `cursor?`, `limit` (1–50, def. 20) — `notificationListQuerySchema` | `{ items: Notification[], nextCursor: string \| null }` — keyset sobre `(createdAt, id)` desc |
| `GET` | `/notifications/unread-count` | — | `{ count }` |
| `PATCH` | `/notifications/read-all` | — | `{ updated }` (nº marcadas) |
| `PATCH` | `/notifications/:id/read` | — | `Notification` — `404` si no es propia; idempotente |
| `GET` | `/notifications/push/public-key` | — | `{ publicKey: string \| null }` — clave VAPID; `null` si el servidor no tiene claves (Web Push desactivado) |
| `GET` | `/notifications/push/status` | — | `{ subscribed: boolean }` — si el profesional tiene algún dispositivo registrado |
| `POST` | `/notifications/push/subscribe` | `PushSubscription.toJSON()` del navegador — `pushSubscribeInputSchema` | `204` — upsert por `endpoint` (único global); reasigna el dispositivo al profesional autenticado |
| `POST` | `/notifications/push/unsubscribe` | `{ endpoint }` — `pushUnsubscribeInputSchema` | `204` — `deleteMany` acotado a `{ endpoint, professionalId }` |

`Notification` (`notificationSchema`): `{ id, type, title, body, data: { bookingId,
customerName, serviceName, startAt, atHome? }, readAt: string \| null, createdAt }`.
`type` hoy solo `APPOINTMENT_CREATED`; para una reserva a domicilio el `title` es
`"Nueva cita a domicilio"` y `data.atHome` es `true`. La dirección del cliente
**nunca** viaja en el payload (ni en el frame SSE) — el profesional abre el
detalle de la cita, cuyo `AgendaBooking` sí trae `customerAddress`. `markRead` /
`markAllRead` filtran por `professionalId` en el `where` del `updateMany`, así que
un profesional no puede tocar la notificación de otro.

**Web Push** entrega la misma fila `Notification` como aviso del sistema
operativo (`pushMessageSchema`: `{ title, body, notificationId, bookingId,
startAt }`). El fan-out vive en `NotificationsService.create()` tras el `INSERT`
y el SSE, es *fire-and-forget*, y poda las suscripciones que devuelven `404`/`410`.
Ver [Notificaciones › Web Push](/features/notifications/#web-push).

## Real-time — `modules/realtime`

| Método | Ruta | Auth | Cuerpo | Respuesta |
| --- | --- | --- | --- | --- |
| `GET` | `/realtime/stream` | JWT | — | `text/event-stream` (SSE) acotado al profesional autenticado |

Stream unidireccional de eventos (servidor → cliente) — un **canal de entrega**
para el feed de notificaciones, no la fuente de verdad. El cliente web lo abre
con `fetch` (no `EventSource`) para enviar el header `Authorization: Bearer`, así
que la conexión usa el **mismo `JwtAuthGuard`** que el resto de las rutas
protegidas. El destinatario es siempre `req.user.id`: no hay nombre de canal que
el cliente pueda pasar, por lo que un profesional no puede recibir los eventos de
otro. Frames `event: ping` cada ~25 s (`REALTIME_HEARTBEAT_MS`) mantienen viva la
conexión. Los eventos son **efímeros** — nada se persiste aquí; un cliente
desconectado recupera todo por `GET /notifications`.

Eventos (`realtimeEventSchema` en `@agendya/types`):

| `type` | Disparador | `data` |
| --- | --- | --- |
| `notification.created` | Fila `Notification` recién creada (p. ej. tras una reserva pública confirmada) | `{ type, notification: Notification }` — la misma forma que devuelve `GET /notifications` |

Sin datos de contacto del cliente, sin `cancellationToken`, sin `professionalId`
suelto (la notificación ya está acotada al stream autenticado).

## Upload — `infra/upload`

| Método | Ruta | Auth | Cuerpo | Respuesta |
| --- | --- | --- | --- | --- |
| `POST` | `/upload/image` | JWT | campo `file` de `multipart/form-data`; `?type=logo\|cover` (por defecto `logo`) | `{ url: "<secure_url de cloudinary>" }` |

Acepta solo `image/png\|jpeg\|webp\|gif` (**sin SVG**). Topes de tamaño: logo
6 MB, portada 12 MB, límite duro 15 MB. `503` si `CLOUDINARY_URL` no está.

## Ejemplos de petición/respuesta

### Crear una reserva

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

### Petición autenticada

```http
GET /bookings?from=2026-09-07&to=2026-09-14 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs…
```

Ver [Manejo de errores](/api/errors/) para las respuestas de fallo.
