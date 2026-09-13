// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

const BASE = '/Agendya/';

/**
 * Prefix `base` onto root-absolute `href` / `src` values written directly in
 * Markdown content (e.g. `[x](/api/reference/)`). Astro/Starlight rebase their
 * own navigation and imported assets, but NOT links authored in page content —
 * on the GitHub Pages project site (served under `/Agendya/`) those would 404.
 * This keeps the repo convention of `/…` (es) and `/en/…` (en) internal links.
 */
function rehypeBaseLinks() {
  const prefix = BASE.replace(/\/$/, '');
  /** @param {any} node */
  const walk = (node) => {
    if (node.type === 'element' && node.properties) {
      for (const attr of ['href', 'src']) {
        const value = node.properties[attr];
        if (
          typeof value === 'string' &&
          value[0] === '/' &&
          value[1] !== '/' &&
          !value.startsWith(BASE)
        ) {
          node.properties[attr] = prefix + value;
        }
      }
    }
    node.children?.forEach(walk);
  };
  /** @param {any} tree */
  return (tree) => walk(tree);
}

// https://astro.build/config
export default defineConfig({
  // Deployed to GitHub Pages as a *project* site at
  // https://emberalab.github.io/Agendya/ — both `site` and `base` are required
  // so generated asset/link URLs carry the `/Agendya/` prefix.
  site: 'https://emberalab.github.io',
  base: BASE,

  markdown: {
    rehypePlugins: [rehypeBaseLinks],
  },

  integrations: [
    // Must come BEFORE starlight so the ```mermaid fences are transformed
    // before Starlight's markdown pipeline highlights them as code.
    mermaid({
      theme: 'default',
      autoTheme: true, // follow Starlight's light/dark toggle
    }),

    starlight({
      title: {
        es: 'Documentación de Agendya',
        en: 'Agendya Docs',
      },
      description:
        'Documentación de ingeniería de Agendya — la plataforma de reservas online para barberías y peluquerías (API NestJS + Prisma, web React + Vite).',
      // Spanish is the default locale (served at `/`); English lives under `/en/`.
      defaultLocale: 'root',
      locales: {
        root: { label: 'Español', lang: 'es' },
        en: { label: 'English', lang: 'en' },
      },
      logo: {
        src: './src/assets/agendya-logo.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      lastUpdated: true,
      customCss: ['./src/styles/custom.css'],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Emberalab/Agendya',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/Emberalab/Agendya/edit/main/docs/',
      },
      // One sidebar drives both locales. `slug` values are locale-agnostic:
      // Starlight resolves them to `/…` (es, root) and `/en/…` (en). Labels are
      // Spanish by default with an `en` override in `translations`.
      sidebar: [
        {
          label: '1 · Resumen',
          translations: { en: '1 · Overview' },
          items: [
            {
              label: '¿Qué es Agendya?',
              translations: { en: 'What is Agendya?' },
              slug: 'overview/what-is-agendya',
            },
            {
              label: 'Arquitectura general',
              translations: { en: 'High-level architecture' },
              slug: 'overview/architecture',
            },
            {
              label: 'Estructura del repositorio',
              translations: { en: 'Repository layout' },
              slug: 'overview/repository-layout',
            },
          ],
        },
        {
          label: '2 · Primeros pasos',
          translations: { en: '2 · Getting Started' },
          items: [
            {
              label: 'Requisitos previos',
              translations: { en: 'Prerequisites' },
              slug: 'getting-started/prerequisites',
            },
            {
              label: 'Instalación',
              translations: { en: 'Installation' },
              slug: 'getting-started/installation',
            },
            {
              label: 'Variables de entorno',
              translations: { en: 'Environment variables' },
              slug: 'getting-started/environment',
            },
            {
              label: 'Desarrollo local',
              translations: { en: 'Local development' },
              slug: 'getting-started/local-development',
            },
            {
              label: 'PWA y desarrollo en red local',
              translations: { en: 'PWA & local network development' },
              slug: 'getting-started/pwa-and-local-network',
            },
            {
              label: 'Base de datos y Prisma',
              translations: { en: 'Database & Prisma' },
              slug: 'getting-started/database',
            },
          ],
        },
        {
          label: '3 · Arquitectura',
          translations: { en: '3 · Architecture' },
          items: [
            {
              label: 'Arquitectura del sistema',
              translations: { en: 'System architecture' },
              slug: 'architecture/system',
            },
            {
              label: 'Arquitectura del frontend',
              translations: { en: 'Frontend architecture' },
              slug: 'architecture/frontend',
            },
            {
              label: 'Arquitectura del backend',
              translations: { en: 'Backend architecture' },
              slug: 'architecture/backend',
            },
            {
              label: 'Flujo de datos',
              translations: { en: 'Data flow' },
              slug: 'architecture/data-flow',
            },
            {
              label: 'Flujo de autenticación',
              translations: { en: 'Authentication flow' },
              slug: 'architecture/authentication',
            },
            {
              label: 'Servicios externos',
              translations: { en: 'External services' },
              slug: 'architecture/external-services',
            },
          ],
        },
        {
          label: '4 · Base de datos',
          translations: { en: '4 · Database' },
          items: [
            {
              label: 'Modelo entidad-relación',
              translations: { en: 'Entity-relationship model' },
              slug: 'database/er-model',
            },
            {
              label: 'Modelos de Prisma',
              translations: { en: 'Prisma models' },
              slug: 'database/models',
            },
            {
              label: 'Índices y restricciones',
              translations: { en: 'Indexes & constraints' },
              slug: 'database/indexes',
            },
            {
              label: 'Datos y ciclo de vida de la cita',
              translations: { en: 'Appointment data & lifecycle' },
              slug: 'database/appointment-lifecycle',
            },
          ],
        },
        {
          label: '5 · Funcionalidades',
          translations: { en: '5 · Features' },
          items: [
            {
              label: 'Autenticación',
              translations: { en: 'Authentication' },
              slug: 'features/authentication',
            },
            {
              label: 'Panel de administrador',
              translations: { en: 'Admin panel' },
              slug: 'features/admin-panel',
            },
            {
              label: 'Profesionales y perfil',
              translations: { en: 'Professionals & profile' },
              slug: 'features/professionals',
            },
            {
              label: 'Servicios',
              translations: { en: 'Services' },
              slug: 'features/services',
            },
            {
              label: 'Horario y excepciones',
              translations: { en: 'Working hours & exceptions' },
              slug: 'features/schedule',
            },
            {
              label: 'Disponibilidad',
              translations: { en: 'Availability' },
              slug: 'features/availability',
            },
            {
              label: 'Citas',
              translations: { en: 'Appointments' },
              slug: 'features/appointments',
            },
            {
              label: 'Agenda y calendario',
              translations: { en: 'Agenda & calendar' },
              slug: 'features/agenda',
            },
            {
              label: 'Notificaciones',
              translations: { en: 'Notifications' },
              slug: 'features/notifications',
            },
          ],
        },
        {
          label: '6 · API',
          translations: { en: '6 · API' },
          items: [
            {
              label: 'Convenciones',
              translations: { en: 'Conventions' },
              slug: 'api/conventions',
            },
            {
              label: 'Referencia de endpoints',
              translations: { en: 'Endpoint reference' },
              slug: 'api/reference',
            },
            {
              label: 'Manejo de errores',
              translations: { en: 'Error handling' },
              slug: 'api/errors',
            },
          ],
        },
        {
          label: '7 · Frontend',
          translations: { en: '7 · Frontend' },
          items: [
            {
              label: 'Enrutamiento',
              translations: { en: 'Routing' },
              slug: 'frontend/routing',
            },
            {
              label: 'Estado y obtención de datos',
              translations: { en: 'State & data fetching' },
              slug: 'frontend/state-and-data',
            },
            {
              label: 'Formularios y validación',
              translations: { en: 'Forms & validation' },
              slug: 'frontend/forms-and-validation',
            },
            {
              label: 'UI y sistema de diseño',
              translations: { en: 'UI & design system' },
              slug: 'frontend/design-system',
            },
          ],
        },
        {
          label: '8 · Pruebas',
          translations: { en: '8 · Testing' },
          slug: 'testing',
        },
        {
          label: '9 · Seguridad',
          translations: { en: '9 · Security' },
          slug: 'security',
        },
        {
          label: '10 · Rendimiento',
          translations: { en: '10 · Performance' },
          slug: 'performance',
        },
        {
          label: '11 · Despliegue',
          translations: { en: '11 · Deployment' },
          slug: 'deployment',
        },
        {
          label: '12 · Guía de desarrollo',
          translations: { en: '12 · Development guide' },
          slug: 'development-guide',
        },
        {
          label: '13 · Solución de problemas',
          translations: { en: '13 · Troubleshooting' },
          slug: 'troubleshooting',
        },
      ],
    }),
  ],
});
