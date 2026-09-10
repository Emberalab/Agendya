---
title: API conventions
description: Base URL, content type, auth, validation, rate limiting and pagination conventions shared by every endpoint.
---

## Base URL

| Environment | URL |
| --- | --- |
| Local | `http://localhost:4000` (`PORT`) |
| From the browser | `VITE_API_URL` or `http://<page-host>:4000` |

No global route prefix — controllers own their full paths. There is **no
`/api` prefix** and **no version segment**.

## Content type

- Requests: `application/json` (except `POST /upload/image`, which is
  `multipart/form-data`).
- Responses: `application/json`. Two exceptions return plain text /
  redirects: `GET /` (`"Agendya API"`) and `GET /auth/google*`.

## Authentication

Send the JWT as a bearer token:

```http
Authorization: Bearer <accessToken>
```

`ExtractJwt.fromAuthHeaderAsBearerToken()` — header only, never a cookie or
query param. Obtain the token from `POST /auth/login`, `POST /auth/register`, or
the Google OAuth redirect (`#token=` fragment). `JwtStrategy` re-loads the
professional and rejects the request if the account is missing or
`isActive === false`.

### Route groups

| Prefix | Auth |
| --- | --- |
| `/` , `/health` | none |
| `/auth/register` , `/auth/login` , `/auth/google*` | none |
| `/public/**` | none (some are token-scoped via the URL) |
| `/auth/me` , `/professionals` , `/services` , `/schedules` , `/bookings` , `/upload` | **JWT required** |

Ownership is enforced in the service layer (`where: { id, professionalId }`) —
a valid token for one professional cannot read or mutate another's rows
(returns `404`).

## Validation

Every body and query is parsed by `ZodValidationPipe(schema)` with a schema
from `@agendya/types`. On failure:

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

`@nestjs/throttler`, global `ThrottlerGuard`.

| Scope | Limit |
| --- | --- |
| Default (all routes) | 100 requests / 60 s |
| `POST /auth/register` , `POST /auth/login` | 5 / 60 s |
| `POST /public/professionals/:slug/bookings` | 10 / 60 s |
| `PATCH` / `POST` on `/public/bookings/:token*` | 10 / 60 s |
| `GET /public/professionals/:slug` , `…/availability` , `GET /public/bookings/:token` | 30 / 60 s |

Exceeding a limit returns `429 Too Many Requests`.

## Pagination

None. List endpoints (`GET /services`, `GET /schedules/*`) return the full set
for the professional. `GET /bookings` is bounded by the required `from` / `to`
date-range query params instead.

## CORS

Allowed origins: `WEB_URL` and, when set, `PUBLIC_WEB_URL` (exact), plus any
`http(s)` origin on
`localhost` / a private-network IP (`127.0.0.1`, `10/8`, `172.16/12`,
`192.168/16`) — the latter for `npm run dev:web:host`. `credentials` is
`false` (no cookie auth). An arbitrary cross-origin `Origin` is **not**
reflected.

## Dates & money

- Timestamps in bodies/responses are ISO-8601 UTC (`z.string().datetime()` on
  input).
- Calendar dates are `YYYY-MM-DD` strings (`dateOnlySchema`).
- Money is integer minor units (`priceCents`) — never a float.
