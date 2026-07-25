import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { Weekday } from '@prisma/client';

const WEEKDAYS_BY_UTC_DAY: Weekday[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/** Day of week is a property of the calendar date itself, independent of timezone. */
export function weekdayFromDateString(dateStr: string): Weekday {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAYS_BY_UTC_DAY[utcDay];
}

/** The UTC instant `date` at `00:00:00` for that calendar day (used for @db.Date columns). */
export function dateOnlyUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the UTC instant for `minutesFromMidnight` on `dateStr`, as experienced in `timeZone`.
 * Works regardless of the server's own system timezone.
 */
export function zonedInstant(
  dateStr: string,
  minutesFromMidnight: number,
  timeZone: string,
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const localWallClock = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return fromZonedTime(localWallClock, timeZone);
}

/** The inverse of `zonedInstant`: the calendar date and minutes-from-midnight of `instant` as experienced in `timeZone`. */
export function zonedDateParts(
  instant: Date,
  timeZone: string,
): { dateStr: string; minutesFromMidnight: number } {
  const zoned = toZonedTime(instant, timeZone);
  const year = zoned.getFullYear();
  const month = String(zoned.getMonth() + 1).padStart(2, '0');
  const day = String(zoned.getDate()).padStart(2, '0');
  const minutesFromMidnight = zoned.getHours() * 60 + zoned.getMinutes();
  return { dateStr: `${year}-${month}-${day}`, minutesFromMidnight };
}
