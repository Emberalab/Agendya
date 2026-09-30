// This app has no schema of its own — InternalUser/SupportTicket/SupportMessage/
// AuditLog live in the same Postgres as apps/api, alongside Professional/Booking
// (real FKs cross that boundary). packages/db/prisma is the one shared source of
// truth both apps' `prisma generate`/`migrate` point at; see apps/api/prisma.config.ts
// for the same pointer from the other side.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: '../../packages/db/prisma/schema.prisma',
  migrations: {
    path: '../../packages/db/prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
