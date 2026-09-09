---
title: Error handling
description: Status codes, error body shapes, and the domain errors each endpoint can raise.
---

## Error body shape

NestJS `HttpException` subclasses serialize to:

```jsonc
{ "statusCode": 409, "message": "Ese horario ya no está disponible.", "error": "Conflict" }
```

Validation failures (`ZodValidationPipe`) use a richer shape:

```jsonc
{
  "message": "Validation failed",
  "errors": { "formErrors": [], "fieldErrors": { "startAt": ["Invalid datetime"] } }
}
```

The web client normalises both via `getApiErrorMessage(error, fallback)`:
`ApiError.data.message` if it's a string, `message.join(' ')` if it's an array,
else the fallback.

## Status codes in use

| Code | Meaning | Raised by (examples) |
| --- | --- | --- |
| `200` / `201` | Success | — |
| `302` | Redirect | `GET /auth/google*` |
| `400 Bad Request` | Validation failed; or a semantic bad request | `ZodValidationPipe`; past `startAt`; at-home without address; non-image upload |
| `401 Unauthorized` | Missing/invalid/expired JWT; bad credentials; password login on a Google-only account | `JwtAuthGuard`, `AuthService.login` |
| `403 Forbidden` | OAuth `state` mismatch; plan-limit reached; cancellation-window violated; booking already expired | `GoogleOAuthStateGuard`, `assertWithinPlanLimit`, `assertModifiable` |
| `404 Not Found` | Unknown slug / token / id, or a row not owned by the caller | professional/service/booking lookups |
| `409 Conflict` | Uniqueness or state conflict | duplicate email; duplicate exception date; slug taken; slot overlap; booking already cancelled/completed |
| `429 Too Many Requests` | Throttle limit exceeded | `ThrottlerGuard` |
| `503 Service Unavailable` | Integration not configured | `UploadService` when `CLOUDINARY_URL` is missing |
| `500` | Unhandled server error | — |

## Domain errors by area

### Auth

| Situation | Code · message |
| --- | --- |
| Email already registered | `409` `El correo ya está registrado.` |
| Unknown email / wrong password | `401` `Credenciales inválidas.` |
| Password login on a Google account | `401` `Esta cuenta usa autenticación con Google.` |
| OAuth callback, missing/mismatched `state` | `403` `Solicitud de autenticación inválida.` |

### Professionals / slug

| Situation | Code · message |
| --- | --- |
| Slug already in use (on update) | `409` `Ese enlace ya está en uso.` |
| Public slug not found / inactive | `404` `Profesional no encontrado.` |

### Services

| Situation | Code · message |
| --- | --- |
| Plan service limit reached | `403` `Alcanzaste el límite de servicios de tu plan.` |
| Service not found / not owned | `404` `Servicio no encontrado.` |

### Schedules

| Situation | Code · message |
| --- | --- |
| Duplicate exception date | `409` `Ya existe un bloqueo para esa fecha.` |
| Exception not found / not owned | `404` `Bloqueo de fecha no encontrado.` |
| Overlapping working blocks / end ≤ start | `400` Validation failed (Zod `superRefine`) |

### Availability

| Situation | Code · message |
| --- | --- |
| Unknown slug | `404` `Profesional no encontrado.` |
| Some `serviceIds` unknown/inactive | `404` `Servicios no encontrados.` / `Algunos servicios no están disponibles.` |
| Malformed query | `400` Validation failed |

### Bookings

| Situation | Code · message |
| --- | --- |
| `startAt` in the past / invalid | `400` `Ese horario ya no está disponible.` |
| At-home without address | `400` `Ingresa la dirección para el servicio a domicilio.` |
| Service not offered at home | `400` `Este servicio no está disponible a domicilio.` |
| Slot outside working hours or on an exception day | `409` `Ese horario ya no está disponible.` |
| Slot overlaps another confirmed booking (incl. serializable retry exhaustion) | `409` `Ese horario ya no está disponible.` / `El nuevo horario no está disponible.` |
| Booking not found / not owned | `404` `Reserva no encontrada.` |
| Cancel/modify an already cancelled/completed/no-show booking | `409` `Esta reserva ya fue cancelada.` / `… completada.` / `… marcada como no asistida.` |
| Cancel/modify an expired or past booking | `403` `Esta reserva ya venció: su horario ya pasó y no puede modificarse.` |
| Inside the cancellation-policy window | `403` `Solo puedes {cancelar\|modificar} con al menos N horas de anticipación.` |
| Complete a booking that isn't `CONFIRMED`/`EXPIRED` | `409` `Solo puedes completar una reserva confirmada o vencida.` |
| Reschedule to the past | `400` `La nueva fecha debe ser en el futuro.` |

:::note
Messages are Spanish (es-CO) because they surface directly in the UI. Keep new
messages in the same language and tone.
:::
