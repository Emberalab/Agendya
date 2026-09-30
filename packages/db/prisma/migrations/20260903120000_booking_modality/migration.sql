-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "atHome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "customerAddress" TEXT;
