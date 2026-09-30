-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'annual');

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN "billingInterval" "BillingInterval",
ADD COLUMN "planExpiresAt" TIMESTAMP(3),
ADD COLUMN "lastWompiTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Professional_lastWompiTransactionId_key" ON "Professional"("lastWompiTransactionId");
