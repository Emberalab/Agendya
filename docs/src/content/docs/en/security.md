---
title: Security
description: Authentication, authorization, input validation, headers, CORS, OAuth CSRF, and secret handling — as built.
---

## Authentication

- **Passwords:** bcrypt, `SALT_ROUNDS = 10`. Stored only as `passwordHash`;
  nullable for Google-only accounts.
- **Sessions:** stateless JWT (`HS256`, secret `JWT_SECRET`), `{ sub, email }`,
  TTL `JWT_EXPIRES_IN` (default `7d`). Sent in the `Authorization` header, never
  a cookie. No refresh tokens.
- **Token validation:** `JwtStrategy.validate` re-loads the professional on
  every request and rejects if missing or `isActive === false` — a disabled
  account is locked out immediately, not at token expiry.
- **Placeholder secret guard:** `bootstrap.ts` logs a warning if `JWT_SECRET`
  is still the `.env.example` value.

## Authorization

- One role. Every guarded controller applies `@UseGuards(JwtAuthGuard)`.
- **Ownership is always re-checked in the service layer**:
  `where: { id, professionalId }` / `findOwnedOrThrow` / `findFirst({ id,
  professionalId })`. A valid token for professional A gets `404`, not another
  user's data, when touching B's rows.
- Public/token routes carry their own scoping: `/public/professionals/:slug`
  exposes only public fields; `/public/bookings/:token` requires the
  unguessable `cancellationToken` (uuid v4, `@unique`).
- `POST /webhooks/wompi` is public but requires Wompi's SHA256 checksum
  (`properties` + `timestamp` + `WOMPI_EVENTS_SECRET`). An `APPROVED` event
  writes `plan` only when the reference is ours and the amount matches
  `PLAN_PRICE_COP`.

## Input validation

- Every body/query → `ZodValidationPipe` with an `@agendya/types` schema.
  Unknown fields are stripped; type/shape violations → `400`.
- Profile image URLs must start `http://`/`https://` — blocks `javascript:` /
  `data:` (defense in depth for any future `<a href>` use).
- Upload: MIME allow-list `png/jpeg/webp/gif` — **SVG rejected** (can embed
  script); per-variant size caps + a hard 15 MB multer limit. The client
  mimetype isn't trusted to admit a scriptable format.
- Email templates: `escapeHtml` on every interpolated value (the booking form
  is public; the professional receives some of those strings in their inbox).

## HTTP headers

`helmet()` in `bootstrap.ts` with defaults (this is a JSON API with no
server-rendered HTML, so the restrictive default CSP stays on):

- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control`, a conservative
  `Content-Security-Policy`, and `X-Powered-By` removed.
- Regression-tested in `security.e2e-spec.ts`.

## CORS

Custom origin function (`bootstrap.ts` + `common/utils/cors.util.ts`):

- **Allowed:** exact `WEB_URL`, plus `PUBLIC_WEB_URL` when set; or any
  `http(s)` origin whose host is
  `localhost` / `127.0.0.1` / `10/8` / `172.16–31` / `192.168/16` (for
  `npm run dev:web:host`).
- **Rejected:** any other cross-origin `Origin` — not reflected (regression
  test: it used to send `Access-Control-Allow-Origin: *`).
- `credentials: false` — no cookies in API auth.

## OAuth CSRF (login CSRF)

`GoogleAuthGuard` generates a random `state` (`randomBytes(24).hex`), stores it
in a `httpOnly`, `sameSite=lax`, 5-minute cookie, and forwards it to Google.
`GoogleOAuthStateGuard` runs before the strategy on the callback and rejects
(`403`) unless `?state` matches the cookie, then clears it. Without this an
attacker could land a victim in a session tied to the attacker's Google
account. Tested in `security.e2e-spec.ts`.

The JWT is returned to the SPA in the URL **fragment** (`#token=`), which is
never sent to a server, logged, or put in a `Referer`;
`GoogleCallbackPage` `replaceState`s it out of history immediately.

## Rate limiting

Global `ThrottlerGuard` 100/60s, with tighter per-route limits on auth (5/60s)
and public booking mutations (10/60s). See
[API conventions](/en/api/conventions/#rate-limiting).

## Concurrency safety

Booking slot writes and reschedules run in `Serializable` transactions with an
explicit overlap check and a bounded retry on serialization failure
(`40001` / Prisma `P2034`). Two customers racing for the same slot: exactly one
succeeds (e2e-tested).

## Secrets

- `.env` is gitignored for both apps; only `.env.example` (placeholders) is
  committed.
- CI injects only non-sensitive values (`JWT_SECRET: ci-test-secret`, a
  local DB URL). No third-party credentials in CI.
- This documentation contains **no** real secrets, keys, passwords or `.env`
  values — by policy.
- Share real integration credentials via a password manager, never a PR or
  chat.

## Known gaps / TODO

- **Password reset** is not implemented (`/forgot-password` page has no API).
- No account lockout / brute-force backoff beyond the 5/60s throttle.
- No 2FA.
- No audit log of professional actions.
