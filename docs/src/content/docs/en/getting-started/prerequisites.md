---
title: Prerequisites
description: Everything you need installed before running Agendya locally.
---

| Requirement | Version | Why | Check |
| --- | --- | --- | --- |
| **Node.js** | `24` (see `.nvmrc`) | Both apps set `"engines": { "node": ">=24" }` | `node --version` |
| **npm** | Bundled with Node 24 | Workspaces, `npm ci` in CI | `npm --version` |
| **Docker Desktop** | Any recent | Runs the local PostgreSQL 16 container | `docker --version` |
| **Git** | Any recent | — | `git --version` |

If you use **nvm**:

```bash
nvm install   # reads .nvmrc → installs Node 24
nvm use
```

## Optional — only for specific work

| Tool | Needed for |
| --- | --- |
| A **Resend** API key | Actually delivering emails locally (otherwise they log to the console) |
| A **Cloudinary** account URL | Testing logo / cover image uploads |
| **Google OAuth** client ID + secret | Testing "Sign in with Google" locally |
| Playwright browsers | Web e2e suite — `npm run test:e2e:install --workspace apps/web` |

:::note
None of the optional integrations are required to run the app, log in with
email/password, create services, set working hours, or take bookings. The API
degrades gracefully when they are absent — see
[External services](/en/architecture/external-services/).
:::

## Ports used

| Port | Service |
| --- | --- |
| `4000` | API (`PORT` env var) |
| `5173` | Web dev server (Vite) |
| `5433` | Local PostgreSQL (host side; container listens on 5432) |
| `4321` | This documentation site (`astro dev`) |
