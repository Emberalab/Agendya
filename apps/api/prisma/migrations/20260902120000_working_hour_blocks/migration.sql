-- Allow multiple working-hour blocks per weekday: a professional can now split a
-- day into several ranges (e.g. 09:00-13:00 and 15:00-18:00).
DROP INDEX "WorkingHour_professionalId_dayOfWeek_key";

-- CreateIndex
CREATE INDEX "WorkingHour_professionalId_dayOfWeek_idx" ON "WorkingHour"("professionalId", "dayOfWeek");
