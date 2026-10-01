-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'INTERNAL_USER_PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'INTERNAL_USER_GOOGLE_LINKED';

-- AlterTable
ALTER TABLE "InternalUser" ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InternalPasswordResetToken" (
    "id" TEXT NOT NULL,
    "internalUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalPasswordResetToken_tokenHash_key" ON "InternalPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InternalPasswordResetToken_internalUserId_idx" ON "InternalPasswordResetToken"("internalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalUser_googleId_key" ON "InternalUser"("googleId");

-- AddForeignKey
ALTER TABLE "InternalPasswordResetToken" ADD CONSTRAINT "InternalPasswordResetToken_internalUserId_fkey" FOREIGN KEY ("internalUserId") REFERENCES "InternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

