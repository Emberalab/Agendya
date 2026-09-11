---
title: Manejo de errores
description: Códigos de estado, formas del cuerpo de error y los errores de dominio que puede lanzar cada endpoint.
---

## Forma del cuerpo de error

Las subclases de `HttpException` de NestJS se serializan a:

```jsonc
{ "statusCode": 409, "message": "Ese horario ya no está disponible.", "error": "Conflict" }
```

Los fallos de validación (`ZodValidationPipe`) usan una forma más rica:

```jsonc
{
  "message": "Validation failed",
  "errors": { "formErrors": [], "fieldErrors": { "startAt": ["Invalid datetime"] } }
}
```

El cliente web normaliza ambos con `getApiErrorMessage(error, fallback)`:
`ApiError.data.message` si es una cadena, `message.join(' ')` si es un array, si
no el fallback.

## Códigos de estado en uso

| Código | Significado | Lanzado por (ejemplos) |
| --- | --- | --- |
| `200` / `201` | Éxito | — |
| `302` | Redirección | `GET /auth/google*` |
| `400 Bad Request` | Falló la validación; o una petición semánticamente incorrecta | `ZodValidationPipe`; `startAt` pasado; a domicilio sin dirección; subida que no es imagen |
| `401 Unauthorized` | JWT faltante/inválido/expirado; credenciales incorrectas; login por contraseña en una cuenta solo de Google | `JwtAuthGuard`, `AuthService.login` |
| `403 Forbidden` | Desajuste del `state` de OAuth; límite de plan alcanzado; ventana de cancelación violada; reserva ya vencida | `GoogleOAuthStateGuard`, `assertWithinPlanLimit`, `assertModifiable` |
| `404 Not Found` | slug / token / id desconocido, o una fila que no pertenece a quien llama | búsquedas de profesional/servicio/reserva |
| `409 Conflict` | Conflicto de unicidad o de estado | email duplicado; fecha de excepción duplicada; slug tomado; solapamiento de espacio; reserva ya cancelada/completada |
| `429 Too Many Requests` | Límite de throttle superado | `ThrottlerGuard` |
| `503 Service Unavailable` | Integración sin configurar | `UploadService` cuando falta `CLOUDINARY_URL` |
| `500` | Error de servidor no manejado | — |

## Errores de dominio por área

### Auth

| Situación | Código · mensaje |
| --- | --- |
| Email ya registrado | `409` `El correo ya está registrado.` |
| Email desconocido / contraseña incorrecta | `401` `Credenciales inválidas.` |
| Login por contraseña en una cuenta de Google | `401` `Esta cuenta usa autenticación con Google.` |
| Callback de OAuth, `state` faltante/no coincide | `302` → `{WEB_URL}/login?error=oauth` (ya no se muestra el JSON `403` en el origen de la API) |

### Profesionales / slug

| Situación | Código · mensaje |
| --- | --- |
| Slug ya en uso (al actualizar) | `409` `Ese enlace ya está en uso.` |
| Slug público no encontrado / inactivo | `404` `Profesional no encontrado.` |

### Servicios

| Situación | Código · mensaje |
| --- | --- |
| Límite de servicios del plan alcanzado | `403` `Alcanzaste el límite de servicios de tu plan.` |
| Servicio no encontrado / no propio | `404` `Servicio no encontrado.` |

### Horarios

| Situación | Código · mensaje |
| --- | --- |
| Fecha de excepción duplicada | `409` `Ya existe un bloqueo para esa fecha.` |
| Excepción no encontrada / no propia | `404` `Bloqueo de fecha no encontrado.` |
| Bloques de horario solapados / fin ≤ inicio | `400` Validation failed (`superRefine` de Zod) |

### Disponibilidad

| Situación | Código · mensaje |
| --- | --- |
| Slug desconocido | `404` `Profesional no encontrado.` |
| Algunos `serviceIds` desconocidos/inactivos | `404` `Servicios no encontrados.` / `Algunos servicios no están disponibles.` |
| Query malformada | `400` Validation failed |

### Reservas

| Situación | Código · mensaje |
| --- | --- |
| `startAt` en el pasado / inválido | `400` `Ese horario ya no está disponible.` |
| A domicilio sin dirección | `400` `Ingresa la dirección para el servicio a domicilio.` |
| Servicio no ofrecido a domicilio | `400` `Este servicio no está disponible a domicilio.` |
| Espacio fuera del horario o en un día de excepción | `409` `Ese horario ya no está disponible.` |
| El espacio solapa otra reserva confirmada (incl. agotamiento de reintentos serializables) | `409` `Ese horario ya no está disponible.` / `El nuevo horario no está disponible.` |
| Reserva no encontrada / no propia | `404` `Reserva no encontrada.` |
| Cancelar/modificar una reserva ya cancelada/completada/no asistida | `409` `Esta reserva ya fue cancelada.` / `… completada.` / `… marcada como no asistida.` |
| Cancelar/modificar una reserva vencida o pasada | `403` `Esta reserva ya venció: su horario ya pasó y no puede modificarse.` |
| Dentro de la ventana de política de cancelación | `403` `Solo puedes {cancelar\|modificar} con al menos N horas de anticipación.` |
| Completar una reserva que no es `CONFIRMED`/`EXPIRED` | `409` `Solo puedes completar una reserva confirmada o vencida.` |
| Reprogramar al pasado | `400` `La nueva fecha debe ser en el futuro.` |

:::note
Los mensajes están en español (es-CO) porque aparecen directamente en la UI.
Mantén los mensajes nuevos en el mismo idioma y tono.
:::
