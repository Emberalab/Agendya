// packages/db/prisma is the one shared source of truth for the schema and
// migration history — apps/backoffice-api points its own prisma.config.ts at
// the same files (InternalUser/SupportTicket/etc. there have real FKs into
// Professional/Booking here), so there is exactly one place either app's
// `prisma migrate`/`generate` ever reads from.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "../../packages/db/prisma/schema.prisma",
  migrations: {
    path: "../../packages/db/prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
