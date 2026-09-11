---
title: Rendimiento
description: Salida del build, división de código, carga diferida, optimización de imágenes y el trabajo de Lighthouse realizado.
---

La app web tuvo una pasada de rendimiento dedicada (PR #30,
`AG-130-perform-a-full-performance-optimization…`, basada en un reporte de
Lighthouse). Esta página documenta lo que está en el código.

## División de código

- **A nivel de ruta** — cada ruta salvo `LoginPage` es `React.lazy()` +
  `<Suspense>` en `AppRouter.tsx`. El subárbol del panel y el asistente de
  reserva pública (un formulario grande de varios pasos) se cargan solo al
  visitarse.
- **Chunk de terceros** — el `manualChunks` de `vite.config.ts` fija
  `react` / `react-dom` / `react-router` / `react-router-dom` / `scheduler` en
  un chunk `react-vendor` que cambia rara vez, para que los deploys de la app no
  lo invaliden en la caché del navegador.

```js
// vite.config.ts
manualChunks(id) {
  if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
    return 'react-vendor';
  }
}
```

## Carga diferida

Los imports de `lazy()` resuelven el export nombrado:

```ts
const AgendaPage = lazy(() =>
  import('../modules/bookings/AgendaPage').then((m) => ({ default: m.AgendaPage })),
);
```

`RouteFallback` renderiza un mínimo "Cargando…" mientras carga un chunk.

## Fuentes

Se cargan como un único `<link rel="stylesheet">` combinado (Google Fonts
`css2`) en `index.html`, **no** con un `@import` de CSS. Un `@import` de CSS
solo se descubre después de que se parsea la hoja de estilos de la app, lo que
añade idas y vueltas antes de la primera petición de fuente — un golpe medible
al FCP. Está puesto `preconnect` a `fonts.googleapis.com` /
`fonts.gstatic.com`. `display=swap` en la URL de la fuente.

## Tema sin parpadeo

`index.html` corre un pequeño script inline **antes del primer paint** que lee
`localStorage['agendya-theme']` (o `prefers-color-scheme`) y establece
`html[data-theme]` + `html.dark-theme`, así que los usuarios de modo oscuro
nunca ven un parpadeo claro. El store de Zustand luego mantiene todo en
sincronía.

## Optimización de imágenes

| Etapa | Qué |
| --- | --- |
| Antes de subir | `professionals/image.ts` — `createImageBitmap` + reducción con `<canvas>` a una dimensión máxima, recodificación (PNG/WebP conservan el alfa, si no JPEG q0.85); devuelve la original si ya es pequeña o si falla la decodificación |
| Al subir | Transforms de Cloudinary: logos `limit 400×400`, portadas `limit 1600×600` |
| En la entrega | `shared/image/cloudinary.ts` reescribe la URL con `f_auto,q_auto[,c_limit,w_<n>]` para que Cloudinary sirva WebP/AVIF a un objetivo de calidad perceptual (~30–50% más pequeño), omitiendo URLs que no son de Cloudinary y URLs que ya llevan un transform |

## Del lado de la API

- Las consultas de reserva/disponibilidad se apoyan en índices compuestos
  ajustados en la migración `20260907120000_optimize_booking_indexes` (ver
  [Índices](/database/indexes/)) para que los caminos calientes no escaneen
  filas históricas.
- `getProfile` ejecuta la obtención del perfil y el conteo de reservas del mes
  con `Promise.all`.
- Prisma usa el driver adapter `@prisma/adapter-pg` sobre un pool de `pg`.

## Salida del build

| App | Comando | Salida |
| --- | --- | --- |
| Web | `npm run build` (`tsc -b && vite build`) | `apps/web/dist/` — activos con hash, chunks `react-vendor` + por ruta |
| API | `npm run build` (`nest build`) | `apps/api/dist/` — se ejecuta con `node dist/main` |
| Types | `tsc` | `packages/types/dist/` |

:::note[Medición]
No hay paso de Lighthouse en CI en `.github/workflows/ci.yml`. Vuelve a
ejecutar Lighthouse manualmente contra un build de `vite preview` al tocar el
tamaño del bundle, la división de rutas, las fuentes o el camino crítico de
CSS.
:::
