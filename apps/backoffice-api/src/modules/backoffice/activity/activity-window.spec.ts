import {
  daysRemaining,
  daysSince,
  localDaysBetween,
  resolveListRange,
  resolveSummaryWindow,
  trialStatus,
} from './activity-window';

const DAY = 24 * 60 * 60 * 1000;
const start = new Date('2026-09-15T15:00:00.000Z');
const end = new Date(start.getTime() + 30 * DAY);
const trial = { trialStartedAt: start, trialEndsAt: end };
const noTrial = { trialStartedAt: null, trialEndsAt: null };

describe('trial status', () => {
  it('is ACTIVE inside the half-open window and ENDED at its end', () => {
    expect(trialStatus(trial, new Date(start.getTime()))).toBe('ACTIVE');
    expect(trialStatus(trial, new Date(end.getTime() - 1))).toBe('ACTIVE');
    expect(trialStatus(trial, end)).toBe('ENDED');
    expect(trialStatus(noTrial)).toBe('NONE');
  });

  it('reports days remaining only while active', () => {
    expect(daysRemaining(trial, new Date(start.getTime() + 15 * DAY))).toBe(15);
    expect(daysRemaining(trial, new Date(end.getTime() + DAY))).toBe(0);
    expect(daysRemaining(noTrial)).toBe(0);
  });
});

describe('resolveSummaryWindow', () => {
  it('runs from the trial start to now while the trial is active', () => {
    const now = new Date(start.getTime() + 10 * DAY);
    expect(resolveSummaryWindow(trial, now)).toEqual({
      basis: 'TRIAL',
      from: start,
      to: now,
    });
  });

  it('stops at the trial end once it is over', () => {
    const now = new Date(end.getTime() + 5 * DAY);
    expect(resolveSummaryWindow(trial, now).to).toEqual(end);
  });

  it('falls back to the last 30 days without a trial', () => {
    const now = new Date('2026-09-30T12:00:00.000Z');
    const window = resolveSummaryWindow(noTrial, now);
    expect(window.basis).toBe('RECENT');
    expect(window.to).toEqual(now);
    expect(now.getTime() - window.from.getTime()).toBe(30 * DAY);
  });
});

describe('resolveListRange', () => {
  it('passes explicit dates through', () => {
    expect(
      resolveListRange(
        { from: '2026-09-01T00:00:00.000Z', to: '2026-09-10T00:00:00.000Z' },
        noTrial,
      ),
    ).toEqual({
      gte: new Date('2026-09-01T00:00:00.000Z'),
      lte: new Date('2026-09-10T00:00:00.000Z'),
    });
  });

  it('clamps to the trial window when trialOnly is set', () => {
    expect(resolveListRange({ trialOnly: true }, trial)).toEqual({
      gte: start,
      lte: end,
    });
    expect(
      resolveListRange(
        { trialOnly: true, from: '2026-09-20T00:00:00.000Z' },
        trial,
      ),
    ).toEqual({ gte: new Date('2026-09-20T00:00:00.000Z'), lte: end });
  });

  it('matches nothing for trialOnly without a trial or a disjoint range', () => {
    expect(resolveListRange({ trialOnly: true }, noTrial)).toBeNull();
    expect(
      resolveListRange(
        { trialOnly: true, to: '2026-09-01T00:00:00.000Z' },
        trial,
      ),
    ).toBeNull();
  });
});

describe('local days', () => {
  it('lists every calendar day in the professional time zone', () => {
    // 2026-09-15 20:00 Bogotá → 2026-09-18 01:00 Bogotá.
    const days = localDaysBetween(
      new Date('2026-09-16T01:00:00.000Z'),
      new Date('2026-09-18T06:00:00.000Z'),
      'America/Bogota',
    );
    expect(days).toEqual([
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
    ]);
  });

  it('counts whole days since the last activity', () => {
    const now = new Date('2026-09-30T12:00:00.000Z');
    expect(daysSince(new Date('2026-09-28T13:00:00.000Z'), now)).toBe(1);
    expect(daysSince(now, now)).toBe(0);
    expect(daysSince(null, now)).toBeNull();
  });
});
