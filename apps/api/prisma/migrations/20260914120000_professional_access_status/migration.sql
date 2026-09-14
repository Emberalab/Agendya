-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN "accessStatus" "AccessStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "Professional_accessStatus_idx" ON "Professional"("accessStatus");
