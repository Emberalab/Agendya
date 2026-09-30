-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO');

-- AlterTable
ALTER TABLE "Professional"
  ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'BASIC';

-- AlterTable
ALTER TABLE "Service"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "homeServiceEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "homeDurationMinutes" INTEGER,
  ADD COLUMN "homePriceCents" INTEGER,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Service_professionalId_deletedAt_idx" ON "Service"("professionalId", "deletedAt");
