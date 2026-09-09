---
title: Requisitos previos
description: Todo lo que necesitas instalado antes de ejecutar Agendya en local.
---

| Requisito | Versión | Por qué | Comprobar |
| --- | --- | --- | --- |
| **Node.js** | `24` (ver `.nvmrc`) | Ambas apps declaran `"engines": { "node": ">=24" }` | `node --version` |
| **npm** | Incluido con Node 24 | Workspaces, `npm ci` en CI | `npm --version` |
| **Docker Desktop** | Cualquiera reciente | Ejecuta el contenedor local de PostgreSQL 16 | `docker --version` |
| **Git** | Cualquiera reciente | — | `git --version` |

Si usas **nvm**:

```bash
nvm install   # lee .nvmrc → instala Node 24
nvm use
```

## Opcional — solo para trabajos concretos

| Herramienta | Necesaria para |
| --- | --- |
| Una API key de **Resend** | Entregar correos de verdad en local (si no, se registran en consola) |
| Una URL de cuenta de **Cloudinary** | Probar las subidas de logo / imagen de portada |
| Client ID + secret de **Google OAuth** | Probar «Iniciar sesión con Google» en local |
| Navegadores de Playwright | Suite e2e web — `npm run test:e2e:install --workspace apps/web` |

:::note
Ninguna de las integraciones opcionales es necesaria para ejecutar la app,
iniciar sesión con email/contraseña, crear servicios, definir el horario o
recibir reservas. La API se degrada de forma elegante cuando faltan — ver
[Servicios externos](/architecture/external-services/).
:::

## Puertos usados

| Puerto | Servicio |
| --- | --- |
| `4000` | API (variable `PORT`) |
| `5173` | Servidor de desarrollo web (Vite) |
| `5433` | PostgreSQL local (lado host; el contenedor escucha en 5432) |
| `4321` | Este sitio de documentación (`astro dev`) |
