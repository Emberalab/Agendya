---
title: Flujo de autenticación
description: >-
  Inicio de sesión con email/contraseña y con Google OAuth 2.0, emisión del JWT
  y cómo se usa el token en cada petición posterior.
---

Dos formas de entrar, una sola salida: un **JWT** firmado (`{ sub, email }`,
`expiresIn` por defecto `7d`) que la app web guarda en `localStorage`
(`agendya-auth`) y envía como `Authorization: Bearer <token>` en cada petición
autenticada. Cada profesional tiene un `role`: `INDEPENDENT` (por defecto),
`SUPER_ADMIN` lo marca una fila en `PlatformAccessEmail` (`access =
SUPER_ADMIN`), no un correo hardcodeado. `BUSINESS_ADMIN` existe en el enum
y no se usa todavía.

La API es **sin estado** — sin almacén de sesión, sin cookie de autenticación.
La única cookie del sistema es la cookie efímera de `state` de OAuth que se
describe abajo.

## Email + contraseña

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario
  participant W as LoginPage / RegisterPage (RHF + Zod)
  participant AC as apiClient
  participant Ctl as AuthController
  participant Svc as AuthService
  participant DB as PostgreSQL
  participant JS as JwtService

  U->>W: email + contraseña (+ businessName al registrarse)
  W->>AC: POST /auth/register  o  /auth/login
  Note over Ctl: @Throttle 5 / 60s
  AC->>Ctl: cuerpo validado por registerSchema / loginSchema
  alt registro
    Ctl->>Svc: register(dto)
    Svc->>DB: findUnique(email)  → 409 si existe
    Svc->>Svc: bcrypt.hash(password, 10)
    Svc->>DB: ensureUniqueSlug(slugify(businessName))
    Svc->>DB: professional.create({ email, passwordHash, businessName, slug })
  else login
    Ctl->>Svc: login(dto)
    Svc->>DB: findUnique(email)  → 401 si no hay
    Svc->>Svc: 401 si no hay passwordHash ("la cuenta usa Google")
    Svc->>Svc: bcrypt.compare  → 401 si no coincide
  end
  Svc->>JS: sign({ sub: id, email })
  Svc-->>Ctl: { accessToken, user: { id, email, businessName, slug, role } }
  Ctl-->>AC: 200 / 201
  AC->>W: authStore.setSession(...)  → persistido en localStorage
  W->>W: if user.role === SUPER_ADMIN → /dashboard else /dashboard/profile
  W->>U: navegar
```

## Google OAuth 2.0

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario
  participant W as App web
  participant Ctl as AuthController
  participant GG as GoogleAuthGuard
  participant SG as GoogleOAuthStateGuard
  participant Goog as Google
  participant Svc as AuthService
  participant CB as GoogleCallbackPage

  U->>W: clic en "Iniciar sesión con Google"
  W->>Ctl: GET /auth/google   (redirección de window.location)
  Ctl->>GG: getAuthenticateOptions
  GG->>GG: state = randomBytes(24).hex
  GG-->>U: Set-Cookie oauth_state (httpOnly, sameSite=lax, 5 min) + 302 a Google
  U->>Goog: consentimiento
  Goog-->>Ctl: GET /auth/google/callback?code=…&state=…
  Ctl->>SG: canActivate
  SG->>SG: comparar query.state con la cookie oauth_state  → 403 si no coincide/falta
  SG->>SG: clearCookie(oauth_state)
  Ctl->>GG: passport intercambia el code, GoogleStrategy.validate construye GoogleUser
  Ctl->>Svc: googleLogin(googleUser)
  Svc->>Svc: findUnique(googleId) ?? (findUnique(email) → enlazar googleId) ?? create({ googleId, email, businessName: "Nombre Apellido", slug, photoUrl })
  Svc-->>Ctl: { accessToken, user }
  Ctl-->>U: 302 a  {WEB_URL}/auth/callback#token=<JWT>
  U->>CB: GoogleCallbackPage lee location.hash
  CB->>CB: history.replaceState (quita el token de la URL)
  CB->>Ctl: GET /auth/me con el bearer token → rellenar businessName/slug
  CB->>W: if user.role === SUPER_ADMIN → /dashboard else /dashboard/profile
```

Por qué el token vuelve en el **fragmento** de la URL (`#token=`), no en un
query string: los fragmentos nunca se envían a ningún servidor, nunca se
escriben en logs de servidor/proxy y nunca se incluyen en una cabecera
`Referer`. `GoogleCallbackPage` lo lee una vez e inmediatamente lo saca del
historial con `replaceState`.

:::note[Protección contra CSRF de login]
Sin la comprobación de `state`, un atacante podría iniciar su propio flujo OAuth
y engañar a una víctima para que lo complete, dejando el navegador de la víctima
en una sesión atada a la cuenta de Google del atacante. `GoogleAuthGuard` genera
el `state` y `GoogleOAuthStateGuard` lo impone en el callback.
:::

:::caution[Estrategia condicional]
`GoogleStrategy` solo se registra cuando están definidos tanto
`GOOGLE_CLIENT_ID` como `GOOGLE_CLIENT_SECRET` (`passport-oauth2` lanza al
construirse si faltan, lo que rompería el bootstrap y toda ejecución e2e en CI).
Sin credenciales, las rutas `/auth/google*` simplemente no están disponibles.
:::

## Usar el token

```mermaid
flowchart LR
  Req["Cualquier petición a una ruta protegida"] --> JG["JwtAuthGuard (AuthGuard('jwt'))"]
  JG --> Extract["ExtractJwt.fromAuthHeaderAsBearerToken()"]
  Extract --> Verify["verificar firma + exp<br/>(secretOrKey = JWT_SECRET)"]
  Verify -->|inválido / expirado| E401["401 Unauthorized"]
  Verify -->|válido| Load["JwtStrategy.validate:<br/>professional.findUnique(payload.sub)"]
  Load -->|no existe o !isActive| E401
  Load -->|ok| Attach["request.user = Professional"]
  Attach --> Handler["handler del controller<br/>(@CurrentUser())"]
```

En el cliente, `apiClient` adjunta la cabecera bearer desde `authStore`;
cualquier respuesta `401` dispara `authStore.logout()`, y los guards de ruta
(`PrivateRoute` / `PublicRoute`) redirigen según la presencia del token.

Lista completa de endpoints en la [página de la funcionalidad de
autenticación](/features/authentication/).
