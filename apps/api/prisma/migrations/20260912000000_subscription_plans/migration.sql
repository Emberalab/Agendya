-- Remap Plan enum: old BASIC (free) → FREE, old PRO → ADVANCED.
-- New paid BASIC / BUSINESS stay unused until assigned.
--
-- RENAME TYPE + ALTER COLUMN is ACCESS EXCLUSIVE on "Professional" only.
-- That table is tiny (one row per account); the lock is brief. A temp-column
-- rewrite would take the same lock twice and is not safer here.
-- Unknown leftover values fall through to FREE so the CAST cannot fail.

ALTER TYPE "Plan" RENAME TO "Plan_old";

CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'ADVANCED', 'BUSINESS');

ALTER TABLE "Professional" ALTER COLUMN "plan" DROP DEFAULT;

ALTER TABLE "Professional"
  ALTER COLUMN "plan" TYPE "Plan"
  USING (
    CASE "plan"::text
      WHEN 'BASIC' THEN 'FREE'
      WHEN 'PRO' THEN 'ADVANCED'
      ELSE 'FREE'
    END
  )::"Plan";

ALTER TABLE "Professional" ALTER COLUMN "plan" SET DEFAULT 'FREE';

DROP TYPE "Plan_old";
