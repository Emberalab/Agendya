-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'BUSINESS_ADMIN', 'INDEPENDENT');

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN "role" "PlatformRole" NOT NULL DEFAULT 'INDEPENDENT';

UPDATE "Professional"
SET "role" = 'SUPER_ADMIN'
WHERE lower("email") = 'info@agendya.co';
