-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ONLINE', 'MANUAL');

-- CreateEnum
CREATE TYPE "UsageAlertKind" AS ENUM ('BOOKINGS_NEAR', 'BOOKINGS_REACHED', 'SERVICES_NEAR', 'SERVICES_REACHED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'ONLINE',
ALTER COLUMN "customerEmail" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UsageLimitAlert" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "kind" "UsageAlertKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLimitAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageLimitAlert_professionalId_idx" ON "UsageLimitAlert"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLimitAlert_professionalId_kind_periodKey_key" ON "UsageLimitAlert"("professionalId", "kind", "periodKey");

-- AddForeignKey
ALTER TABLE "UsageLimitAlert" ADD CONSTRAINT "UsageLimitAlert_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
