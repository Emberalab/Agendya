-- Public-profile banner image + free-form brand colour.
ALTER TABLE "Professional" ADD COLUMN "coverImageUrl" TEXT;
ALTER TABLE "Professional" ALTER COLUMN "brandColor" SET DEFAULT '#4F46E5';
