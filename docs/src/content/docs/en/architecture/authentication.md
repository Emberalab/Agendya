---
title: Authentication flow
description: >-
  Email/password and Google OAuth 2.0 sign-in, JWT issuance, and how the token
  is used on every subsequent request.
---

Two ways in, one output: a signed **JWT** (`{ sub, email }`, `expiresIn`
default `7d`) that the web app stores in `localStorage` (`agendya-auth`) and
sends as `Authorization: Bearer <token>` on every authenticated request.

The API is **stateless** — no session store, no auth cookie. The only cookie in
the system is the short-lived OAuth `state` cookie described below.

## Email + password

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant W as LoginPage / RegisterPage (RHF + Zod)
  participant AC as apiClient
  participant Ctl as AuthController
  participant Svc as AuthService
  participant DB as PostgreSQL
  participant JS as JwtService

  U->>W: email + password (+ businessName on register)
  W->>AC: POST /auth/register  or  /auth/login
  Note over Ctl: @Throttle 5 / 60s
  AC->>Ctl: body validated by registerSchema / loginSchema
  alt register
    Ctl->>Svc: register(dto)
    Svc->>DB: findUnique(email)  → 409 if exists
    Svc->>Svc: bcrypt.hash(password, 10)
    Svc->>DB: ensureUniqueSlug(slugify(businessName))
    Svc->>DB: professional.create({ email, passwordHash, businessName, slug })
  else login
    Ctl->>Svc: login(dto)
    Svc->>DB: findUnique(email)  → 401 if none
    Svc->>Svc: 401 if no passwordHash ("account uses Google")
    Svc->>Svc: bcrypt.compare  → 401 on mismatch
  end
  Svc->>JS: sign({ sub: id, email })
  Svc-->>Ctl: { accessToken, user: { id, email, businessName, slug } }
  Ctl-->>AC: 200 / 201
  AC->>W: authStore.setSession(...)  → persisted to localStorage
  W->>U: navigate to /dashboard/profile
```

## Google OAuth 2.0

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant W as Web app
  participant Ctl as AuthController
  participant GG as GoogleAuthGuard
  participant SG as GoogleOAuthStateGuard
  participant Goog as Google
  participant Svc as AuthService
  participant CB as GoogleCallbackPage

  U->>W: click "Sign in with Google"
  W->>Ctl: GET /auth/google   (window.location redirect)
  Ctl->>GG: getAuthenticateOptions
  GG->>GG: state = randomBytes(24).hex
  GG-->>U: Set-Cookie oauth_state (httpOnly, sameSite=lax, 5 min) + 302 to Google
  U->>Goog: consent
  Goog-->>Ctl: GET /auth/google/callback?code=…&state=…
  Ctl->>SG: canActivate
  SG->>SG: compare query.state vs oauth_state cookie  → 403 on mismatch/missing
  SG->>SG: clearCookie(oauth_state)
  Ctl->>GG: passport exchanges code, GoogleStrategy.validate builds GoogleUser
  Ctl->>Svc: googleLogin(googleUser)
  Svc->>Svc: findUnique(googleId) ?? (findUnique(email) → link googleId) ?? create({ googleId, email, businessName: "First Last", slug, photoUrl })
  Svc-->>Ctl: { accessToken, user }
  Ctl-->>U: 302 to  {WEB_URL}/auth/callback#token=<JWT>
  U->>CB: GoogleCallbackPage reads location.hash
  CB->>CB: history.replaceState (strip token from URL)
  CB->>Ctl: GET /auth/me with Bearer token → fill businessName/slug
  CB->>U: navigate to /dashboard/profile
```

Why the token comes back in the URL **fragment** (`#token=`), not a query
string: fragments are never sent to any server, never written to server/proxy
logs, and never included in a `Referer` header. `GoogleCallbackPage` reads it
once and immediately `replaceState`s it out of history.

:::note[Login-CSRF protection]
Without the `state` check, an attacker could start their own OAuth flow and
trick a victim into completing it, landing the victim's browser in a session
tied to the attacker's Google account. `GoogleAuthGuard` mints the `state` and
`GoogleOAuthStateGuard` enforces it on the callback.
:::

:::caution[Conditional strategy]
`GoogleStrategy` is only registered when both `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are set (`passport-oauth2` throws at construction
otherwise, which would break bootstrap and every e2e run in CI). With no
credentials, `/auth/google*` routes are simply unavailable.
:::

## Using the token

```mermaid
flowchart LR
  Req["Any request to a guarded route"] --> JG["JwtAuthGuard (AuthGuard('jwt'))"]
  JG --> Extract["ExtractJwt.fromAuthHeaderAsBearerToken()"]
  Extract --> Verify["verify signature + exp<br/>(secretOrKey = JWT_SECRET)"]
  Verify -->|invalid / expired| E401["401 Unauthorized"]
  Verify -->|valid| Load["JwtStrategy.validate:<br/>professional.findUnique(payload.sub)"]
  Load -->|missing or !isActive| E401
  Load -->|ok| Attach["request.user = Professional"]
  Attach --> Handler["controller handler<br/>(@CurrentUser())"]
```

On the client, `apiClient` attaches the bearer header from `authStore`; any
`401` response triggers `authStore.logout()`, and the route guards
(`PrivateRoute` / `PublicRoute`) redirect based on token presence.

Full endpoint list on the [Authentication feature page](/en/features/authentication/).
