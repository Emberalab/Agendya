---
title: Convenciones de la API
description: URL base, tipo de contenido, autenticación, validación, rate limiting y paginación comunes a todos los endpoints.
---

## URL base

| Entorno | URL |
| --- | --- |
| Local | `http://localhost:4000` (`PORT`) |
| Desde el navegador | `VITE_API_URL` o `http://<host-de-la-página>:4000` |

Sin prefijo global de rutas — los controladores son dueños de sus rutas
completas. **No hay prefijo `/api`** ni **segmento de versión**.

## Tipo de contenido

- Peticiones: `application/json` (salvo `POST /upload/image`, que es
  `multipart/form-data`).
- Respuestas: `application/json`. Dos excepciones devuelven texto plano /
  redirecciones: `GET /` (`"Agendya API"`) y `GET /auth/google*`.

## Autenticación

Envía el JWT como bearer token:

```http
Authorization: Bearer <accessToken>
```

`ExtractJwt.fromAuthHeaderAsBearerToken()` — solo cabecera, nunca una cookie ni
un query param. Obtén el token de `POST /auth/login`, `POST /auth/register` o la
redirección de Google OAuth (fragmento `#token=`). `JwtStrategy` recarga al
profesional y rechaza la petición si la cuenta no existe o
`isActive === false`.

### Grupos de rutas

| Prefijo | Auth |
| --- | --- |
| `/` , `/health` | ninguna |
| `/auth/register` , `/auth/login` , `/auth/google*` | ninguna |
| `/public/**` | ninguna (algunas van acotadas por token en la URL) |
| `/auth/me` , `/professionals` , `/services` , `/schedules` , `/bookings` , `/upload` | **JWT obligatorio** |

La propiedad se impone en la capa de servicio (`where: { id, professionalId }`)
— un token válido de un profesional no puede leer ni mutar las filas de otro
(devuelve `404`).

## Validación

Cada cuerpo y query se parsea con `ZodValidationPipe(schema)` con un esquema de
`@agendya/types`. Ante fallo:

```jsonc
// 400 Bad Request
{
  "message": "Validation failed",
  "errors": {
    "formErrors": [],
    "fieldErrors": { "email": ["Invalid email"] }
  }
}
```

## Rate limiting

`@nestjs/throttler`, `ThrottlerGuard` global.

| Alcance | Límite |
| --- | --- |
| Por defecto (todas las rutas) | 100 peticiones / 60 s |
| `POST /auth/register` , `POST /auth/login` | 5 / 60 s |
| `POST /public/professionals/:slug/bookings` | 10 / 60 s |
| `PATCH` / `POST` en `/public/bookings/:token*` | 10 / 60 s |
| `GET /public/professionals/:slug` , `…/availability` , `GET /public/bookings/:token` | 30 / 60 s |

Superar un límite devuelve `429 Too Many Requests`.

## Paginación

Ninguna. Los endpoints de lista (`GET /services`, `GET /schedules/*`) devuelven
el conjunto completo del profesional. `GET /bookings` se acota con los query
params obligatorios de rango de fechas `from` / `to`.

## CORS

Orígenes permitidos: `WEB_URL` y, si está definido, `PUBLIC_WEB_URL`
(exactos), más cualquier origen
`http(s)` en `localhost` / una IP de red privada (`127.0.0.1`, `10/8`,
`172.16/12`, `192.168/16`) — este último para `npm run dev:web:host`.
`credentials` es `false` (sin autenticación por cookie). Un `Origin`
cross-origin arbitrario **no** se refleja.

## Fechas y dinero

- Los timestamps en cuerpos/respuestas son UTC ISO-8601 (`z.string().datetime()`
  en la entrada).
- Las fechas de calendario son cadenas `YYYY-MM-DD` (`dateOnlySchema`).
- El dinero son unidades menores enteras (`priceCents`) — nunca un flotante.
