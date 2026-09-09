---
title: Instalación
description: Clonar, instalar, configurar y arrancar ambas apps desde un checkout limpio.
---

La guía canónica está en el `README.md` del repo. Esta página es el mismo flujo
con más contexto.

1. **Clonar y seleccionar Node 24**

   ```bash
   git clone https://github.com/Emberalab/Agendya.git
   cd Agendya
   nvm use            # o: nvm install
   ```

2. **Instalar todos los workspaces**

   ```bash
   npm install
   ```

   El `postinstall` de la raíz ejecuta `npm run build --workspace packages/types`
   (compila `@agendya/types` a `dist/`), y el `postinstall` propio de `apps/api`
   ejecuta `prisma generate` (crea el cliente Prisma tipado).

3. **Crear los archivos de entorno**

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   `apps/api/.env.example` trae valores por defecto que funcionan en local
   (coinciden con las credenciales de Postgres de Docker). `apps/web/.env`
   normalmente no necesita cambios — `VITE_API_URL` se autodetecta. Ver
   [Variables de entorno](/getting-started/environment/).

4. **Levantar PostgreSQL**

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

   Contenedor `agendya-postgres`, base de datos `agendya_dev`, expuesta en el
   puerto host `5433`.

5. **Aplicar las migraciones de la base de datos**

   ```bash
   cd apps/api && npx prisma migrate deploy && cd ../..
   ```

   Vuelve a ejecutarlo después de cualquier `git pull` que agregue migraciones.

6. **Ejecutar la API** (terminal 1)

   ```bash
   npm run dev:api        # NestJS en http://localhost:4000
   ```

7. **Ejecutar la app web** (terminal 2)

   ```bash
   npm run dev:web        # Vite en http://localhost:5173
   ```

## Verificar

| Comprobación | Esperado |
| --- | --- |
| `curl http://localhost:4000` | `Agendya API` |
| `curl http://localhost:4000/health` | `{"status":"ok","timestamp":"…"}` |
| Abrir `http://localhost:5173` | Redirige a `/login` |
| Registrarse en `/register` y luego ir a `/dashboard/profile` | Carga tu nuevo perfil de profesional |

## Opcional — sembrar servicios de demo

```bash
node apps/api/prisma/seed-services.mjs
```

Crea un conjunto de servicios de ejemplo para un profesional existente. Revisa
el script para ver a qué cuenta apunta.

## Problemas habituales en la primera ejecución

Ver [Solución de problemas](/troubleshooting/). Los sospechosos de siempre:
Docker sin arrancar, puerto `5433`/`4000`/`5173` ya en uso, o migraciones sin
aplicar (`prisma migrate deploy`).
