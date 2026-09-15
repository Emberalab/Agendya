-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "authorProfessionalId" TEXT,
ALTER COLUMN "authorInternalUserId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SupportMessage_authorProfessionalId_idx" ON "SupportMessage"("authorProfessionalId");

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorProfessionalId_fkey" FOREIGN KEY ("authorProfessionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
