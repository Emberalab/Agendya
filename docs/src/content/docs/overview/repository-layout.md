---
title: Estructura del repositorio
description: >-
  Recorrido directorio por directorio del monorepo de Agendya, incluidas las
  carpetas que intencionalmente no forman parte del sistema en ejecución.
---

Monorepo de **workspaces** de npm. Node.js 24 (`.nvmrc`). Los scripts de la raíz
se reparten por todos los workspaces con `--workspaces --if-present`.

```
Agendya/
├── apps/
│   ├── api/                     backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma            modelo de dominio
│   │   │   ├── migrations/              12 migraciones SQL (a la fecha de la Fase 1)
│   │   │   └── seed-services.mjs        seeder opcional de servicios de demo
│   │   ├── src/
│   │   │   ├── main.ts / bootstrap.ts   entrada + cableado de seguridad compartido
│   │   │   ├── app.module.ts            módulo raíz
│   │   │   ├── config/configuration.ts  env → config tipada
│   │   │   ├── common/                  pipes, decoradores, utils (slug, timezone, cors)
│   │   │   ├── database/                PrismaService (módulo global)
│   │   │   ├── infra/
│   │   │   │   ├── mail/                MailService (Resend) + escapado de HTML
│   │   │   │   └── upload/              subida de imágenes a Cloudinary
│   │   │   └── modules/
│   │   │       ├── auth/                JWT + Google OAuth, guards, estrategias
│   │   │       ├── professionals/       perfil + público-por-slug
│   │   │       ├── services/            CRUD + límites de plan
│   │   │       ├── schedules/           horario, excepciones, disponibilidad
│   │   │       └── bookings/            crear/gestionar + crons de recordatorio y expiración
│   │   └── test/                        specs e2e de Jest (*.e2e-spec.ts)
│   └── web/                      frontend React
│       ├── index.html                  script de tema pre-paint, <link>s de fuentes
│       ├── vite.config.ts              plugins de react + tailwind, manualChunks
│       ├── playwright.config.ts        config e2e de Playwright
│       ├── src/
│       │   ├── main.tsx                 QueryClientProvider + StrictMode
│       │   ├── routes/                  AppRouter, PrivateRoute, PublicRoute
│       │   ├── shared/                  apiClient, store de tema, a11y, átomos de UI, utils de imagen
│       │   └── modules/                 auth, dashboard, professionals, services,
│       │                                schedules, bookings, publicBooking
│       │       └── <módulo>/
│       │           ├── api.ts           envoltorios finos sobre fetch
│       │           ├── hooks/           useQuery / useMutation por operación
│       │           └── *.tsx            páginas y componentes (+ *.test.tsx)
│       ├── tests/                       specs de Playwright + fixtures que stubean la API
│       └── Agendya-main/       ⚠️ exportación de Figma Make — NO es la app en vivo (en .gitignore)
├── packages/
│   └── types/                    @agendya/types — esquemas Zod, compilados a dist/ al instalar
├── infra/
│   └── docker-compose.yml        Postgres local en :5433  ← usa este
├── docker-compose.yml           ⚠️ duplicado obsoleto en la raíz — confirma antes de usarlo
├── docs/                         este sitio de documentación (Astro + Starlight)
├── .github/workflows/ci.yml      lint → typecheck → migrate → test → e2e → build
├── MVP-v1.md                     alcance de la Fase 1 (léelo antes de funcionalidades grandes)
├── Fase-2/3/4-*.md               fases posteriores — fuera de alcance
├── Arquitectura-Tecnica.md       contexto de arquitectura (prosa)
├── Stack-Tecnologico.md          contexto de stack (prosa)
└── README.md                     guía de puesta en marcha
```

## Carpetas que no son el sistema en ejecución

:::caution[`apps/web/Agendya-main/`]
Una exportación de diseño de **Figma Make** autocontenida con su propio
`package.json` y sus propios `CLAUDE.md`/`AGENTS.md` genéricos. Está excluida de
git (`apps/web/.gitignore` → `/Agendya-main`). Solo toma cosas de ahí cuando
portes deliberadamente una pantalla concreta a `apps/web/src`. Las ediciones
dentro de esa carpeta **no** afectan a la app en ejecución.
:::

:::caution[`docker-compose.yml` de la raíz]
Un duplicado obsoleto de `infra/docker-compose.yml` con nombres de contenedor
distintos. Tanto la guía del README como CLAUDE.md apuntan a
`infra/docker-compose.yml` — usa ese.
:::

## Archivos duplicados `… 2`

Algunos archivos existen por duplicado con el sufijo ` 2` (`apps/api/src/bootstrap 2.ts`,
`CLAUDE 2.md`, `apps/api/test/security.e2e-spec 2.ts`). Son artefactos de
editor/sincronización; `.gitignore` incluso lista `node_modules 2`. El archivo
sin sufijo es el real.
