-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "planCancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "planEnabledAt" TIMESTAMP(3),
ADD COLUMN     "planLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BillingNotice" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingNotice_transactionId_key" ON "BillingNotice"("transactionId");

-- CreateIndex
CREATE INDEX "BillingNotice_professionalId_idx" ON "BillingNotice"("professionalId");

-- CreateIndex
CREATE INDEX "Service_professionalId_planLocked_idx" ON "Service"("professionalId", "planLocked");

-- AddForeignKey
ALTER TABLE "BillingNotice" ADD CONSTRAINT "BillingNotice_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
