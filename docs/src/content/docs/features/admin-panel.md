---
title: Panel de Administrador
description: >-
  Lista de acceso de closed beta, catálogo de funcionalidades por plan y cambio
  de suscripción desde Super Admin.
---

`/dashboard/admin` solo lo ve una cuenta con `Professional.role = SUPER_ADMIN`.
El API exige JWT + `SuperAdminGuard`. Un profesional independiente que entre a
esa ruta vuelve a `/dashboard/profile`.

El rol se asigna **al registrarse** si existe una fila `PlatformAccessEmail`
con `access = SUPER_ADMIN`. El login no escala ni degrada el rol.

## Lista de acceso

Tabla `PlatformAccessEmail` (`ALLOWLISTED` | `SUPER_ADMIN`). En Railway
`production`/`dev` es quien puede registrarse; local/CI está abierto. Ver
[Autenticación](/features/authentication/).

- Listar, crear (email en minúsculas), cambiar grant, eliminar. Cada fila
  incluye el `plan` del `Professional` si ya se registró (`null` = solo está
  en la lista), más `billingInterval` (mensual/anual), `planStartedAt`
  (comprado) y `planExpiresAt` (vence) cuando el ciclo vino de un pago Wompi.
- No puedes bajarte ni borrarte a ti mismo (`403`).
- No puedes dejar 0 grants `SUPER_ADMIN` (`400`), ni por PATCH ni por DELETE.
- Cambiar un grant a `SUPER_ADMIN` **no** promueve una cuenta ya creada.

## Funcionalidades por plan

Vista de solo lectura de `FEATURE_CATALOG` (`@agendya/types`). No se persiste
ni se edita desde el panel. `enforced: true` hoy solo en `maxServices` y
`maxBookingsPerMonth`.

## Precios e ingresos

Pestaña **Precios**: tabla de lo que paga el profesional, comisión Wompi y
neto. Fuente: `packages/types/src/plans/billing.ts`. El primer cobro lo hace el profesional
con el Widget en Perfil; el cargo recurrente aún no corre.

Tarifa asumida: Wompi plan avanzado agregador, **2,65% + $700 + IVA 19% sobre
la comisión**. Básico se publicó a $19.900; el precio de lista es **$21.900 /
mes** para que el neto no baje de eso. Si pagan el año de una vez (Básico
**$254.900**) se ahorran **$7.900** frente a 12 mensualidades.

Medios: tarjeta, Nequi, Bancolombia. Si el cobro falla, el plan de pago
sigue **3 días**; sin `APPROVED`, baja a Gratuito. Super Admin puede
reasignar a mano.

## Cambiar plan

Busca un `Professional` por email y hace `PATCH` solo de `plan`. No toca
`role`. El JWT no lleva plan: el profesional ve el cambio en el siguiente
`GET /professionals/me`.

## Endpoints

Todos: JWT + `SUPER_ADMIN`.

| Método | Ruta | Notas |
| --- | --- | --- |
| `GET` | `/admin/allowlist` | Lista `AllowlistEntry[]` |
| `POST` | `/admin/allowlist` | `createAllowlistEntrySchema` · `409` si el correo ya existe |
| `PATCH` | `/admin/allowlist/:email` | `{ access }` · `403`/`400` según las reglas de arriba |
| `DELETE` | `/admin/allowlist/:email` | `{ deleted: true }` |
| `GET` | `/admin/professionals/:email` | `{ id, email, businessName, slug, plan }` · `404` |
| `PATCH` | `/admin/professionals/:email/plan` | `{ plan }` (`planSchema`) · `404` |
