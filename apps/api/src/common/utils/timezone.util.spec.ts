import {
  dateOnlyUtc,
  formatDateOnly,
  weekdayFromDateString,
  zonedDateParts,
  zonedInstant,
} from './timezone.util';

describe('weekdayFromDateString', () => {
  it.each([
    ['2026-08-01', 'SATURDAY'],
    ['2026-08-02', 'SUNDAY'],
    ['2026-08-03', 'MONDAY'],
  ])('%s is %s', (dateStr, expected) => {
    expect(weekdayFromDateString(dateStr)).toBe(expected);
  });
});

describe('dateOnlyUtc', () => {
  it('produces a UTC-midnight instant for the given calendar date', () => {
    const date = dateOnlyUtc('2026-08-01');
    expect(date.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });
});

describe('formatDateOnly', () => {
  it('formats a UTC date back into yyyy-MM-dd', () => {
    expect(formatDateOnly(new Date('2026-08-01T00:00:00.000Z'))).toBe(
      '2026-08-01',
    );
  });
});

describe('zonedInstant', () => {
  it('resolves a fixed-offset timezone (America/Bogota, UTC-5, no DST)', () => {
    const instant = zonedInstant('2026-08-01', 9 * 60, 'America/Bogota');
    expect(instant.toISOString()).toBe('2026-08-01T14:00:00.000Z');
  });

  it('resolves a DST-observing timezone correctly in summer (America/New_York, UTC-4)', () => {
    const instant = zonedInstant('2026-08-01', 9 * 60, 'America/New_York');
    expect(instant.toISOString()).toBe('2026-08-01T13:00:00.000Z');
  });

  it('resolves a DST-observing timezone correctly in winter (America/New_York, UTC-5)', () => {
    const instant = zonedInstant('2026-01-15', 9 * 60, 'America/New_York');
    expect(instant.toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });

  it('is independent of the process default timezone', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';
    try {
      const instant = zonedInstant('2026-08-01', 9 * 60, 'America/Bogota');
      expect(instant.toISOString()).toBe('2026-08-01T14:00:00.000Z');
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

describe('zonedDateParts', () => {
  it('recovers the calendar date and minutes for a fixed-offset timezone', () => {
    const parts = zonedDateParts(
      new Date('2026-08-01T14:30:00.000Z'),
      'America/Bogota',
    );
    expect(parts).toEqual({
      dateStr: '2026-08-01',
      minutesFromMidnight: 9 * 60 + 30,
    });
  });

  it('recovers correctly across a DST boundary (America/New_York summer)', () => {
    const parts = zonedDateParts(
      new Date('2026-08-01T13:00:00.000Z'),
      'America/New_York',
    );
    expect(parts).toEqual({
      dateStr: '2026-08-01',
      minutesFromMidnight: 9 * 60,
    });
  });

  it('rolls over to the next calendar day when the zone is ahead of UTC', () => {
    // 2026-08-01T23:00Z is 2026-08-02 04:00 in a UTC+5 zone (Asia/Karachi, no DST).
    const parts = zonedDateParts(
      new Date('2026-08-01T23:00:00.000Z'),
      'Asia/Karachi',
    );
    expect(parts).toEqual({
      dateStr: '2026-08-02',
      minutesFromMidnight: 4 * 60,
    });
  });

  it('round-trips with zonedInstant', () => {
    const original = { dateStr: '2026-03-10', minutesFromMidnight: 645 };
    const instant = zonedInstant(
      original.dateStr,
      original.minutesFromMidnight,
      'America/New_York',
    );
    expect(zonedDateParts(instant, 'America/New_York')).toEqual(original);
  });
});
