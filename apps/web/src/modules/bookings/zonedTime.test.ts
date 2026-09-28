import { describe, expect, it } from 'vitest';
import {
  formatMinutes,
  weekdayOf,
  zonedDateParts,
  zonedTimeToUtc,
} from './zonedTime';

describe('zonedTime', () => {
  it('converts a Bogotá wall-clock time to UTC', () => {
    expect(
      zonedTimeToUtc('2026-10-05', 9 * 60 + 15, 'America/Bogota').toISOString(),
    ).toBe('2026-10-05T14:15:00.000Z');
  });

  it('reads the date and minutes of an instant in a timezone', () => {
    expect(
      zonedDateParts(new Date('2026-10-06T02:30:00.000Z'), 'America/Bogota'),
    ).toEqual({ dateStr: '2026-10-05', minutes: 21 * 60 + 30 });
  });

  it('round-trips across a DST change', () => {
    const instant = zonedTimeToUtc('2026-03-08', 10 * 60, 'America/New_York');
    expect(instant.toISOString()).toBe('2026-03-08T14:00:00.000Z');
    expect(zonedDateParts(instant, 'America/New_York')).toEqual({
      dateStr: '2026-03-08',
      minutes: 600,
    });
  });

  it('returns the weekday of a date string', () => {
    expect(weekdayOf('2026-10-05')).toBe('MONDAY');
  });

  it('formats minutes as a 12-hour label', () => {
    expect(formatMinutes(0)).toBe('12:00 a. m.');
    expect(formatMinutes(13 * 60 + 45)).toBe('1:45 p. m.');
  });
});
