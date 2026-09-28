import { WEEKDAYS, type Weekday } from '@agendya/types';

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** `YYYY-MM-DD` and minutes-from-midnight of `date` as seen in `timeZone`. */
export function zonedDateParts(
  date: Date,
  timeZone: string,
): { dateStr: string; minutes: number } {
  const p = zoneParts(date, timeZone);
  const dateStr = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { dateStr, minutes: p.hour * 60 + p.minute };
}

/** The UTC instant of wall-clock `dateStr` + `minutes` in `timeZone`. */
export function zonedTimeToUtc(
  dateStr: string,
  minutes: number,
  timeZone: string,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const p = zoneParts(new Date(guess), timeZone);
  const offset =
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess;
  return new Date(guess - offset);
}

export function weekdayOf(dateStr: string): Weekday {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
