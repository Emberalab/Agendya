# Agendya documentation site

Engineering documentation for Agendya, built with
[Astro](https://astro.build) + [Starlight](https://starlight.astro.build) and
[`astro-mermaid`](https://github.com/joesaby/astro-mermaid) for diagrams.

It is a **separate workspace** (not part of the npm workspaces monorepo) so its
Astro/Vite toolchain never interferes with `apps/*`.

## Bilingual — Spanish (default) + English

The site is fully bilingual via Starlight i18n:

| Locale | Served at | Content lives in |
| --- | --- | --- |
| **Español** (default) | `/…` | `src/content/docs/**` (root) |
| **English** | `/en/…` | `src/content/docs/en/**` |

A language picker in the header switches between them. Every page exists in both
languages — keep them in sync. The sidebar is defined once in
`astro.config.mjs`; each label is Spanish with an `translations: { en: '…' }`
override.

## Local development

```bash
cd docs
npm install       # first time only
npm run dev       # http://localhost:4321
npm run build     # production build → docs/dist/
npm run preview   # serve the production build locally
npm run check     # astro check (types + content)
```

From the repo root you can also use:

```bash
npm run docs          # dev server
npm run docs:build    # production build
```

## Structure

```
docs/
├── astro.config.mjs           site config + i18n locales + the whole sidebar
├── src/
│   ├── content.config.ts      Starlight content collection
│   ├── content/docs/          SPANISH pages (default locale, served at /)
│   │   ├── index.mdx          landing page (splash)
│   │   ├── overview/  getting-started/  architecture/  database/
│   │   ├── features/  api/  frontend/
│   │   ├── testing|security|performance|deployment|development-guide|troubleshooting.md
│   │   └── en/                ENGLISH pages (served at /en/) — same tree, mirrored
│   ├── styles/custom.css      Agendya theme (indigo accent, light/dark)
│   └── assets/agendya-logo.svg
└── public/favicon.svg
```

## Writing conventions

- **Derive from the code.** Every claim should trace to the Prisma schema, a
  NestJS controller/service, a React route/hook, `package.json`, a test, or the
  CI workflow. If something is genuinely unclear, add a `:::caution` / `TODO`
  aside — don't invent behaviour.
- **Visual first.** Prefer Mermaid diagrams, tables, and Starlight asides
  (`:::note`, `:::tip`, `:::caution`, `:::danger`) over walls of prose.
- **Mermaid:** use ```` ```mermaid ```` fences. `astro-mermaid` is registered
  *before* Starlight so fences are transformed before markdown highlighting.
- **New page:** create it **twice** — Spanish at `src/content/docs/<path>` and
  English at `src/content/docs/en/<path>` — then register the `slug` once in the
  `sidebar` array in `astro.config.mjs` (Spanish `label` + `translations: { en }`).
  Spanish pages link with `/…`; English pages link with `/en/…`. `npm run build`
  validates every internal link and sidebar slug.
- **No secrets** — never paste real keys, passwords, or `.env` values.

## Deployment

`.github/workflows/docs.yml` builds this site and publishes it to **GitHub
Pages** on pushes to `main` that touch `docs/**`. Before the first deploy:

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. In `astro.config.mjs` set the real `site` URL (and `base: '/Agendya/'` for a
   project site), replacing the `TODO` placeholder.
