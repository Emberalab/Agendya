-- AlterTable
ALTER TABLE "Professional"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN "googleId" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "brandColor" TEXT DEFAULT '#FFFFFF';

-- CreateIndex
CREATE UNIQUE INDEX "Professional_googleId_key" ON "Professional"("googleId");

-- CreateIndex
CREATE INDEX "Professional_googleId_idx" ON "Professional"("googleId");
