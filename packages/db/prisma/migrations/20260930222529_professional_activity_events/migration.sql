-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('ACCOUNT', 'CONFIGURATION', 'SERVICE', 'SCHEDULE', 'APPOINTMENT', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('ACCOUNT_CREATED', 'LOGGED_IN', 'PASSWORD_RESET', 'DASHBOARD_VISITED', 'PROFILE_UPDATED', 'SERVICE_CREATED', 'SERVICE_UPDATED', 'SERVICE_DELETED', 'WORKING_HOURS_UPDATED', 'SCHEDULE_EXCEPTION_CREATED', 'SCHEDULE_EXCEPTION_DELETED', 'BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED', 'PUSH_ENABLED', 'PUSH_DISABLED');

-- CreateEnum
CREATE TYPE "ActivityActor" AS ENUM ('PROFESSIONAL', 'CUSTOMER', 'SYSTEM');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SUPPORT_VIEWED_PROFESSIONAL_ACTIVITY';

-- CreateTable
CREATE TABLE "ProfessionalActivityEvent" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "actor" "ActivityActor" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "subject" TEXT,
    "metadata" JSONB,
    "backfilled" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalActivityEvent_dedupeKey_key" ON "ProfessionalActivityEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "ProfessionalActivityEvent_professionalId_occurredAt_idx" ON "ProfessionalActivityEvent"("professionalId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ProfessionalActivityEvent_professionalId_category_occurredA_idx" ON "ProfessionalActivityEvent"("professionalId", "category", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ProfessionalActivityEvent_entityType_entityId_idx" ON "ProfessionalActivityEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ProfessionalActivityEvent" ADD CONSTRAINT "ProfessionalActivityEvent_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: reconstruct only what existing rows can prove, with their real
-- timestamps, flagged `backfilled`. Reschedules, completions, service/profile
-- edits, logins, visits, deleted blocked dates and earlier working-hour
-- versions left no trace before this table existed and are NOT invented.
-- No customer contact data is copied.

INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, p."id", 'ACCOUNT_CREATED'::"ActivityEventType", 'ACCOUNT'::"ActivityCategory", 'PROFESSIONAL'::"ActivityActor", 'Professional', p."id", true, p."createdAt"
FROM "Professional" p;

INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "subject", "metadata", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, s."professionalId", 'SERVICE_CREATED'::"ActivityEventType", 'SERVICE'::"ActivityCategory", 'PROFESSIONAL'::"ActivityActor", 'Service', s."id", s."name",
       jsonb_build_object('name', s."name", 'priceCents', s."priceCents", 'durationMinutes', s."durationMinutes", 'homeServiceEnabled', s."homeServiceEnabled"),
       true, s."createdAt"
FROM "Service" s;

INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "subject", "metadata", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, s."professionalId", 'SERVICE_DELETED'::"ActivityEventType", 'SERVICE'::"ActivityCategory", 'PROFESSIONAL'::"ActivityActor", 'Service', s."id", s."name",
       jsonb_build_object('name', s."name"), true, s."deletedAt"
FROM "Service" s
WHERE s."deletedAt" IS NOT NULL;

-- Working hours are replaced wholesale on every save, so only the current
-- version (saved at its rows' createdAt) is recoverable; `before` is unknown.
WITH day_blocks AS (
  SELECT "professionalId", "dayOfWeek",
         jsonb_agg(jsonb_build_array("startMinute", "endMinute") ORDER BY "startMinute") AS blocks,
         MAX("createdAt") AS saved_at
  FROM "WorkingHour"
  GROUP BY "professionalId", "dayOfWeek"
), week AS (
  SELECT "professionalId",
         jsonb_agg(jsonb_build_object('dayOfWeek', "dayOfWeek", 'blocks', blocks) ORDER BY "dayOfWeek") AS days,
         MAX(saved_at) AS saved_at
  FROM day_blocks
  GROUP BY "professionalId"
)
INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "metadata", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, w."professionalId", 'WORKING_HOURS_UPDATED'::"ActivityEventType", 'SCHEDULE'::"ActivityCategory", 'PROFESSIONAL'::"ActivityActor", 'WorkingHours', w."professionalId",
       jsonb_build_object('before', NULL::jsonb, 'after', w.days), true, w.saved_at
FROM week w;

INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "subject", "metadata", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, e."professionalId", 'SCHEDULE_EXCEPTION_CREATED'::"ActivityEventType", 'SCHEDULE'::"ActivityCategory", 'PROFESSIONAL'::"ActivityActor", 'ScheduleException', e."id",
       to_char(e."date", 'YYYY-MM-DD'), jsonb_build_object('date', to_char(e."date", 'YYYY-MM-DD'), 'reason', e."reason"), true, e."createdAt"
FROM "ScheduleException" e;

INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "subject", "metadata", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, b."professionalId", 'BOOKING_CREATED'::"ActivityEventType", 'APPOINTMENT'::"ActivityCategory",
       (CASE WHEN b."source" = 'MANUAL' THEN 'PROFESSIONAL' ELSE 'CUSTOMER' END)::"ActivityActor",
       'Booking', b."id", b."serviceNameSnapshot",
       jsonb_build_object('source', b."source", 'serviceName', b."serviceNameSnapshot", 'startAt', to_char(b."startAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'atHome', b."atHome"),
       true, b."createdAt"
FROM "Booking" b;

INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "subject", "metadata", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, b."professionalId", 'BOOKING_CANCELLED'::"ActivityEventType", 'APPOINTMENT'::"ActivityCategory",
       (CASE b."cancelledBy" WHEN 'customer' THEN 'CUSTOMER' WHEN 'professional' THEN 'PROFESSIONAL' ELSE 'SYSTEM' END)::"ActivityActor",
       'Booking', b."id", b."serviceNameSnapshot",
       jsonb_build_object('serviceName', b."serviceNameSnapshot", 'startAt', to_char(b."startAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
       true, b."cancelledAt"
FROM "Booking" b
WHERE b."status" = 'CANCELLED' AND b."cancelledAt" IS NOT NULL;

INSERT INTO "ProfessionalActivityEvent" ("id", "professionalId", "type", "category", "actor", "entityType", "entityId", "backfilled", "occurredAt")
SELECT gen_random_uuid()::text, ps."professionalId", 'PUSH_ENABLED'::"ActivityEventType", 'NOTIFICATION'::"ActivityCategory", 'PROFESSIONAL'::"ActivityActor", 'PushSubscription', ps."id", true, ps."createdAt"
FROM "PushSubscription" ps;
