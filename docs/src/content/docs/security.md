---
title: Seguridad
description: Autenticación, autorización, validación de entrada, cabeceras, CORS, CSRF de OAuth y manejo de secretos — tal como está construido.
---

## Autenticación

- **Contraseñas:** bcrypt, `SALT_ROUNDS = 10`. Se guardan solo como
  `passwordHash`; nullable para cuentas solo de Google.
- **Sesiones:** JWT sin estado (`HS256`, secreto `JWT_SECRET`), `{ sub, email }`,
  TTL `JWT_EXPIRES_IN` (por defecto `7d`). Se envía en la cabecera
  `Authorization`, nunca una cookie. Sin refresh tokens.
- **Validación del token:** `JwtStrategy.validate` recarga al profesional en
  cada petición y rechaza si no existe o `isActive === false` — una cuenta
  deshabilitada queda bloqueada de inmediato, no al expirar el token.
- **Guarda del secreto de ejemplo:** `bootstrap.ts` registra una advertencia si
  `JWT_SECRET` sigue siendo el valor de `.env.example`.

## Autorización

- Un rol. Cada controlador protegido aplica `@UseGuards(JwtAuthGuard)`.
- **La propiedad siempre se revalida en la capa de servicio**:
  `where: { id, professionalId }` / `findOwnedOrThrow` / `findFirst({ id,
  professionalId })`. Un token válido del profesional A obtiene `404`, no los
  datos de otro usuario, al tocar las filas de B.
- Las rutas públicas/con token llevan su propio acotamiento:
  `/public/professionals/:slug` expone solo campos públicos;
  `/public/bookings/:token` requiere el `cancellationToken` inadivinable
  (uuid v4, `@unique`).
- `POST /webhooks/wompi` es público pero exige el checksum SHA256 de Wompi
  (`properties` + `timestamp` + `WOMPI_EVENTS_SECRET`). Un evento `APPROVED`
  solo escribe `plan` si la referencia es nuestra y el monto coincide con
  `PLAN_PRICE_COP`.

## Validación de entrada

- Cada cuerpo/query → `ZodValidationPipe` con un esquema de `@agendya/types`.
  Los campos desconocidos se descartan; las violaciones de tipo/forma → `400`.
- Las URLs de imagen de perfil deben empezar por `http://`/`https://` — bloquea
  `javascript:` / `data:` (defensa en profundidad para cualquier uso futuro de
  `<a href>`).
- Subida: lista blanca de MIME `png/jpeg/webp/gif` — **SVG rechazado** (puede
  incrustar script); topes de tamaño por variante + un límite duro de multer de
  15 MB. No se confía en el mimetype del cliente para admitir un formato que
  pueda llevar script.
- Plantillas de correo: `escapeHtml` en cada valor interpolado (el formulario de
  reserva es público; el profesional recibe algunas de esas cadenas en su
  bandeja de entrada).

## Cabeceras HTTP

`helmet()` en `bootstrap.ts` con los valores por defecto (esta es una API JSON
sin HTML renderizado en servidor, así que la CSP restrictiva por defecto se
queda encendida):

- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control`, una
  `Content-Security-Policy` conservadora, y `X-Powered-By` eliminado.
- Con test de regresión en `security.e2e-spec.ts`.

## CORS

Función de origen a medida (`bootstrap.ts` + `common/utils/cors.util.ts`):

- **Permitido:** `WEB_URL` exacto, y `PUBLIC_WEB_URL` si está definido; o
  cualquier origen `http(s)` cuyo host sea
  `localhost` / `127.0.0.1` / `10/8` / `172.16–31` / `192.168/16` (para
  `npm run dev:web:host`).
- **Rechazado:** cualquier otro `Origin` cross-origin — no se refleja (test de
  regresión: antes enviaba `Access-Control-Allow-Origin: *`).
- `credentials: false` — sin cookies en la autenticación de la API.

## CSRF de OAuth (CSRF de login)

`GoogleAuthGuard` genera un `state` aleatorio (`randomBytes(24).hex`), lo guarda
en una cookie `httpOnly`, `sameSite=lax`, de 5 minutos, y lo reenvía a Google.
`GoogleOAuthStateGuard` corre antes de la estrategia en el callback y rechaza
(`403`) a menos que `?state` coincida con la cookie, luego la limpia. Sin esto
un atacante podría dejar a una víctima en una sesión atada a la cuenta de Google
del atacante. Testeado en `security.e2e-spec.ts`.

El JWT se devuelve a la SPA en el **fragmento** de la URL (`#token=`), que nunca
se envía a un servidor, se registra ni se pone en un `Referer`;
`GoogleCallbackPage` lo saca del historial con `replaceState` de inmediato.

## Rate limiting

`ThrottlerGuard` global 100/60s, con límites más ajustados por ruta en auth
(5/60s) y en las mutaciones de reserva pública (10/60s). Ver
[Convenciones de la API](/api/conventions/#rate-limiting).

## Seguridad ante concurrencia

Las escrituras de espacio de reserva y las reprogramaciones corren en
transacciones `Serializable` con un chequeo de solapamiento explícito y un
reintento acotado ante fallo de serialización (`40001` / Prisma `P2034`). Dos
clientes compitiendo por el mismo espacio: exactamente uno tiene éxito
(testeado en e2e).

## Secretos

- `.env` está en `.gitignore` para ambas apps; solo se commitea `.env.example`
  (valores de ejemplo).
- CI inyecta solo valores no sensibles (`JWT_SECRET: ci-test-secret`, una URL de
  BD local). Sin credenciales de terceros en CI.
- Esta documentación **no** contiene secretos, claves, contraseñas ni valores de
  `.env` reales — por política.
- Comparte las credenciales de integración reales por un gestor de contraseñas,
  nunca por un PR o un chat.

## Brechas conocidas / TODO

- El **restablecimiento de contraseña** no está implementado (la página
  `/forgot-password` no tiene API).
- Sin bloqueo de cuenta / backoff ante fuerza bruta más allá del throttle de
  5/60s.
- Sin 2FA.
- Sin registro de auditoría de las acciones del profesional.
