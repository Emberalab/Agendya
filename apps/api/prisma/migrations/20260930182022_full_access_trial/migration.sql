-- CreateEnum
CREATE TYPE "TrialEventAction" AS ENUM ('GRANTED', 'EXTENDED', 'ENDED');

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "trialStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TrialEvent" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "action" "TrialEventAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "previousEndsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrialEvent_professionalId_createdAt_idx" ON "TrialEvent"("professionalId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Professional_trialEndsAt_idx" ON "Professional"("trialEndsAt");

-- AddForeignKey
ALTER TABLE "TrialEvent" ADD CONSTRAINT "TrialEvent_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
