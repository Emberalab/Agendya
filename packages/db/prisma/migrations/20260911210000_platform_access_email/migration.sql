-- Closed-beta grants and Super Admin live in this table, not in application code.
-- Add/remove rows here (or via Prisma Studio) to change who can sign in and
-- who receives Professional.role = SUPER_ADMIN.
--
-- The previous migration already set role = SUPER_ADMIN on an existing
-- Professional whose email was info@agendya.co (no-op if that row was missing).

CREATE TYPE "PlatformAccessKind" AS ENUM ('SUPER_ADMIN', 'ALLOWLISTED');

CREATE TABLE "PlatformAccessEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "access" "PlatformAccessKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAccessEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAccessEmail_email_key" ON "PlatformAccessEmail"("email");

INSERT INTO "PlatformAccessEmail" ("id", "email", "access") VALUES
    (gen_random_uuid(), 'info@agendya.co', 'SUPER_ADMIN'),
    (gen_random_uuid(), 'hjose0650@gmail.com', 'ALLOWLISTED'),
    (gen_random_uuid(), 'afz.0228@gmail.com', 'ALLOWLISTED'),
    (gen_random_uuid(), 'jorgeemherrera@gmail.com', 'ALLOWLISTED');
