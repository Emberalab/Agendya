-- Existing services predate plan locking: treat them as enabled since creation
-- so the FIFO swap has a deterministic order.
UPDATE "Service" SET "planEnabledAt" = "createdAt" WHERE "planEnabledAt" IS NULL;
