-- Index tuning for growth. Non-destructive: only index add/drop, no data change.
--
-- 1. Drop two redundant secondary indexes on Professional. `slug` and `googleId`
--    are already UNIQUE, and a unique constraint is backed by a btree index that
--    already serves every equality lookup and sort the app does on those columns
--    (Professional_slug_key / Professional_googleId_key remain). The extra
--    non-unique copies only added write and storage overhead.
DROP INDEX "Professional_slug_idx";
DROP INDEX "Professional_googleId_idx";

-- 2. Add a composite index matching the availability / overlap-guard query
--    (equality on professionalId + status, range on startAt). Without status in
--    the index, that query walks every past booking row for the professional as
--    the table grows; with it, the scan stays on live (CONFIRMED) bookings.
CREATE INDEX "Booking_professionalId_status_startAt_idx" ON "Booking"("professionalId", "status", "startAt");

-- 3. Index the Booking.serviceId foreign key. Postgres does not create one
--    automatically; without it the ON DELETE SET NULL path and any
--    per-service lookup fall back to a full scan of the largest table.
CREATE INDEX "Booking_serviceId_idx" ON "Booking"("serviceId");
