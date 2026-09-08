---
title: Profesionales y perfil
description: La cuenta del profesional, su perfil editable, la marca y la página pública.
---

El `Professional` es el único tipo de cuenta. Todo lo demás (servicios,
horario, reservas) cuelga de él.

## Campos del perfil

Se editan en `/dashboard/profile` (`ProfilePage.tsx`), se guardan vía
`PATCH /professionals/me` con un cuerpo **parcial** (`updateProfileSchema` —
todos los campos opcionales).

| Grupo | Campos |
| --- | --- |
| Identidad | `businessName`, `slug`, `category` |
| Marca | `logoUrl`, `coverImageUrl`, `photoUrl`, `brandColor` (hex de 6 dígitos) |
| Texto | `description` (≤ 500) |
| Reglas de reserva | `timezone` (IANA), `cancellationPolicyHours` (uno de `1, 2, 3, 4, 6, 24`) |

`brandColor` se edita con un deslizador de tono (`professionals/color.ts` —
`hueToHex` / `hexToHue`, S/L fijos) más muestras predefinidas
(`BRAND_COLOR_PRESETS`).

Las imágenes se reducen en el navegador (`professionals/image.ts`) y luego se
envían a `POST /upload/image?type=logo|cover`, que devuelve una URL de
Cloudinary que se guarda de vuelta en el perfil.

## Gestión del slug

```mermaid
flowchart LR
  T["el usuario escribe un slug"] --> V["slugSchema: minúsculas, 3-50,<br/>^[a-z0-9]+(-[a-z0-9]+)*$"]
  V --> A["GET /professionals/check-slug?slug=…"]
  A --> R{"¿disponible?"}
  R -->|sí| OK["mostrar ✓, permitir guardar"]
  R -->|no| X["mostrar ✗"]
  OK --> S["PATCH /professionals/me { slug }"]
  S --> C{"¿sigue siendo único en el servidor?"}
  C -->|no| E["409 'Ese enlace ya está en uso.'"]
  C -->|sí| D["guardado → la página pública pasa a /:slug"]
```

`check-slug` excluye el slug actual de quien llama, así que volver a guardar un
slug sin cambios lo reporta como disponible.

## Endpoints

| Método | Ruta | Auth | Propósito |
| --- | --- | --- | --- |
| `GET` | `/professionals/me` | JWT | Perfil completo + `bookingsThisMonth` + `monthlyBookingLimit` |
| `PATCH` | `/professionals/me` | JWT | Actualización parcial; se revalida la unicidad del slug |
| `GET` | `/professionals/check-slug?slug=` | JWT | `{ available: boolean }` |
| `GET` | `/public/professionals/:slug` | ninguna · `@Throttle 30/60s` | Perfil público + servicios activos |

## Respuesta de `GET /professionals/me`

```jsonc
{
  "id": "uuid",
  "email": "pro@example.com",
  "businessName": "Barbería Central",
  "slug": "barberia-central",
  "category": "Barbería",
  "photoUrl": null,
  "logoUrl": "https://res.cloudinary.com/…",
  "coverImageUrl": null,
  "brandColor": "#4F46E5",
  "description": "…",
  "timezone": "America/Bogota",
  "cancellationPolicyHours": 24,
  "plan": "BASIC",
  "bookingsThisMonth": 12,      // reservas no canceladas creadas desde el día 1 (UTC)
  "monthlyBookingLimit": 100,   // null en PRO
  "createdAt": "…",
  "updatedAt": "…"
}
```

## Página pública

`GET /public/professionals/:slug` (usada por `PublicBookingPage`) devuelve solo
lo que un cliente debe ver: `businessName`, `slug`, `category`, imágenes,
`brandColor`, `description` y los **servicios activos y no borrados** ordenados
por `sortOrder` — sin email, plan, timezone ni conteos.

## Planes

| | `BASIC` (`Plan Gratuito`) | `PRO` (`Plan Pro`) |
| --- | --- | --- |
| Servicios | 3 | ilimitado |
| Reservas / mes | 100 | ilimitado |

Las constantes viven en `@agendya/types` (`PLAN_SERVICE_LIMITS`,
`PLAN_MONTHLY_BOOKING_LIMITS`, `PLAN_LABELS`). **No hay flujo de
facturación/upgrade** — `plan` solo es `BASIC` a menos que se cambie
directamente en la base de datos.
