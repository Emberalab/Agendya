---
title: Autenticación
description: Registro, inicio de sesión, sesiones y el modelo de cuenta — tal como está implementado.
---

Cubierto de extremo a extremo (con diagramas de secuencia) en
[Arquitectura → Flujo de autenticación](/architecture/authentication/). Esta
página es el resumen a nivel de funcionalidad y la lista de endpoints.

## Formas de autenticarse

| Método | Punto de entrada (web) | API | Notas |
| --- | --- | --- | --- |
| Email + contraseña | `/register`, `/login` | `POST /auth/register`, `POST /auth/login` | bcrypt (`SALT_ROUNDS = 10`); contraseñas de 8–72 caracteres |
| Google OAuth 2.0 | Botón «Iniciar sesión con Google» | `GET /auth/google` → `GET /auth/google/callback` | Solo disponible cuando las credenciales de Google están configuradas |

Hay una ruta y una página `/forgot-password` en la app web, pero **todavía no
existe un endpoint de restablecimiento de contraseña en la API** — trata la
página como un placeholder.

:::caution[TODO — restablecimiento de contraseña]
`ForgotPasswordPage.tsx` está enrutada y se renderiza, pero no existe un handler
`/auth/forgot-password` ni `/auth/reset-password` en `apps/api`. Conectar esto es
trabajo sin terminar, no una funcionalidad documentada.
:::

## Endpoints

| Método | Ruta | Auth | Cuerpo / parámetros | Respuesta |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | ninguna · `@Throttle 5/60s` | `{ email, password, businessName }` (`registerSchema`) | `{ accessToken, user }` |
| `POST` | `/auth/login` | ninguna · `@Throttle 5/60s` | `{ email, password }` (`loginSchema`) | `{ accessToken, user }` · `401 ACCOUNT_NOT_FOUND` se queda en `/login` con CTA a registro |
| `GET` | `/auth/me` | JWT | — | `{ id, email, businessName, slug, role, accessStatus }` |
| `GET` | `/auth/google` | ninguna | — | 302 a Google (+ pone la cookie `oauth_state`) |
| `GET` | `/auth/google/callback` | cookie `state` + Google | `?code&state` | 302 a `{WEB_URL}/auth/callback#token=<JWT>` · declinado: `/login?error=declined` · `state` inválido: `/login?error=oauth` |

Forma de `user`: `{ id, email, businessName, slug, role, accessStatus }`. `PENDING`
entra a `/acceso-pendiente`. `SUPER_ADMIN` entra a `/dashboard` sin el menú del
profesional.

## Modelo de cuenta

- Una tabla: **`Professional`**. `passwordHash` es nullable (las cuentas solo de
  Google no tienen); iniciar sesión con contraseña en una cuenta así devuelve
  `401 "Esta cuenta usa autenticación con Google."`.
- El registro deriva un `slug` único a partir de `businessName` vía `slugify` +
  `ensureUniqueSlug`.
- El login con Google resuelve la cuenta por `googleId`, si no por `email`
  (enlazando `googleId` a la fila existente), si no crea un nuevo profesional
  llamado `"Nombre Apellido"`.
- `isActive = false` deshabilita una cuenta: `JwtStrategy.validate` rechaza sus
  tokens con `401`.
- `accessStatus`: `PENDING` \| `APPROVED` \| `DECLINED`. El registro siempre crea
  la fila. Sin grant en beta cerrada queda `PENDING` (sesión sí, panel no).
  `DECLINED` no entra. `JwtStrategy` rechaza `DECLINED` y permite `PENDING`.
- `role`: `INDEPENDENT` por defecto; `SUPER_ADMIN` si el correo tiene una fila
  `PlatformAccessEmail` con `access = SUPER_ADMIN` (la semilla incluye
  `info@agendya.co` y `afz.0228@gmail.com`). `BUSINESS_ADMIN` está en el enum
  y no se usa.

## Periodo de prueba (acceso pendiente)

El registro **siempre** crea un `Professional`. Sin grant en
`PlatformAccessEmail` (ni match en `PROFESSIONAL_EMAIL_ALLOWLIST`) el
`accessStatus` queda `PENDING` y la web manda a `/acceso-pendiente`. Super
Admin ve todas las cuentas en **Registros** y puede Aceptar / Declinar.

`PROFESSIONAL_EMAIL_ALLOWLIST=""` (string vacío) abre el producto: los
`PENDING` entran al panel sin un update masivo (`DECLINED` sigue fuera). Un
grant `SUPER_ADMIN` o `ALLOWLISTED` nace `APPROVED`. Las páginas públicas
`/:slug` solo muestran cuentas `APPROVED` mientras el kill switch no esté
abierto.

## Ciclo de vida de la sesión (web)

```mermaid
flowchart LR
  L["login / registro / callback de OAuth"] --> S["authStore.setSession({ accessToken, user })"]
  S --> P["persistido → localStorage 'agendya-auth'"]
  P --> R["apiClient añade Authorization: Bearer en cada petición"]
  R --> E{"¿La API devuelve 401?"}
  E -->|sí| O["authStore.logout() → token borrado"]
  O --> RD["PrivateRoute redirige a /login"]
  E -->|no| C["continuar"]
```

El TTL del token es `JWT_EXPIRES_IN` (por defecto `7d`). No hay flujo de refresh
token; la expiración implica volver a iniciar sesión.
