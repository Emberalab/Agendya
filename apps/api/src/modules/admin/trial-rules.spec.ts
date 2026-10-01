import {
  TRIAL_DURATION_DAYS,
  TRIAL_PLAN,
  effectivePlan,
  hasUsedTrial,
  isTrialActive,
  toTrialInfo,
  trialDaysRemaining,
  trialEndsAtFrom,
} from '@agendya/types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Pure trial rules shared by the API and the web app (@agendya/types). */
describe('trial rules', () => {
  // 1 Sep 2026, 10:00 in Bogotá (UTC-5, no DST).
  const start = new Date('2026-09-01T15:00:00.000Z');
  const end = trialEndsAtFrom(start);
  const trial = { trialStartedAt: start, trialEndsAt: end };

  describe('configuration', () => {
    it('grants 30 days of the top plan (full access)', () => {
      expect(TRIAL_DURATION_DAYS).toBe(30);
      expect(TRIAL_PLAN).toBe('BUSINESS');
    });
  });

  describe('trialEndsAtFrom', () => {
    it('adds exactly TRIAL_DURATION_DAYS × 24h to the activation instant', () => {
      expect(end.toISOString()).toBe('2026-10-01T15:00:00.000Z');
      expect(end.getTime() - start.getTime()).toBe(TRIAL_DURATION_DAYS * DAY);
    });

    it('keeps the local time of day for an account activated just before midnight in Bogotá', () => {
      // 23:59 on 1 Sep in Bogotá is already 2 Sep in UTC.
      const lateStart = new Date('2026-09-02T04:59:00.000Z');
      const lateEnd = trialEndsAtFrom(lateStart);
      expect(
        lateEnd.toLocaleString('en-US', {
          timeZone: 'America/Bogota',
          hour12: false,
        }),
      ).toBe('10/1/2026, 23:59:00');
    });

    it('is exactly 720 hours even across a DST change in other time zones', () => {
      // US DST ends 1 Nov 2026; the window still lasts exactly 30 × 24h.
      const usStart = new Date('2026-10-20T16:00:00.000Z');
      expect(trialEndsAtFrom(usStart).getTime() - usStart.getTime()).toBe(
        720 * HOUR,
      );
    });

    it('accepts an explicit length for future trial variants', () => {
      expect(trialEndsAtFrom(start, 7).getTime() - start.getTime()).toBe(
        7 * DAY,
      );
    });
  });

  describe('isTrialActive boundaries', () => {
    it.each([
      ['just started (at the activation instant)', start, true],
      ['mid-trial', new Date(start.getTime() + 15 * DAY), true],
      ['1 ms before it ends', new Date(end.getTime() - 1), true],
      [
        'on its last day, hours before the end',
        new Date(end.getTime() - 5 * HOUR),
        true,
      ],
      ['exactly at trialEndsAt', end, false],
      ['expired yesterday', new Date(end.getTime() + DAY), false],
      ['expired weeks ago', new Date(end.getTime() + 21 * DAY), false],
      ['before it starts', new Date(start.getTime() - 1), false],
    ])('%s → %s', (_label, now, expected) => {
      expect(isTrialActive(trial, now)).toBe(expected);
    });

    it('is inactive for an account that never had a trial', () => {
      expect(
        isTrialActive({ trialStartedAt: null, trialEndsAt: null }, start),
      ).toBe(false);
    });

    it('does not depend on the process time zone (instants only)', () => {
      const original = process.env.TZ;
      try {
        process.env.TZ = 'Pacific/Kiritimati'; // UTC+14
        expect(isTrialActive(trial, new Date(end.getTime() - 1))).toBe(true);
        expect(isTrialActive(trial, end)).toBe(false);
      } finally {
        process.env.TZ = original;
      }
    });
  });

  describe('effectivePlan', () => {
    const during = new Date(start.getTime() + DAY);
    const after = new Date(end.getTime() + 9 * DAY); // e.g. returns on 10 Oct

    it('gives full access to a FREE account during the trial', () => {
      expect(effectivePlan({ plan: 'FREE', ...trial }, during)).toBe(
        'BUSINESS',
      );
    });

    it('falls back to FREE automatically after the trial, with no write needed', () => {
      expect(effectivePlan({ plan: 'FREE', ...trial }, after)).toBe('FREE');
      expect(effectivePlan({ plan: 'FREE', ...trial }, end)).toBe('FREE');
    });

    it('upgrades a lower paid plan during the trial', () => {
      expect(effectivePlan({ plan: 'BASIC', ...trial }, during)).toBe(
        'BUSINESS',
      );
    });

    it('lets a paid plan take over once the trial has expired', () => {
      expect(effectivePlan({ plan: 'ADVANCED', ...trial }, after)).toBe(
        'ADVANCED',
      );
    });

    it('never downgrades a plan at or above the trial plan', () => {
      expect(effectivePlan({ plan: 'BUSINESS', ...trial }, during)).toBe(
        'BUSINESS',
      );
    });

    it('is the billed plan when there is no trial', () => {
      expect(
        effectivePlan(
          { plan: 'BASIC', trialStartedAt: null, trialEndsAt: null },
          during,
        ),
      ).toBe('BASIC');
    });
  });

  describe('trialDaysRemaining', () => {
    it.each([
      [start, 30],
      [new Date(end.getTime() - 12 * DAY), 12],
      [new Date(end.getTime() - 5 * HOUR), 1],
      [end, 0],
      [new Date(end.getTime() + DAY), 0],
    ])('at %s → %i', (now, expected) => {
      expect(trialDaysRemaining(end, now)).toBe(expected);
    });
  });

  describe('toTrialInfo / hasUsedTrial', () => {
    it('reports the window and server-computed active flag', () => {
      expect(toTrialInfo(trial, new Date(start.getTime() + DAY))).toEqual({
        startedAt: start.toISOString(),
        endsAt: end.toISOString(),
        active: true,
      });
      expect(toTrialInfo(trial, end)?.active).toBe(false);
    });

    it('marks an expired trial as used so it is not granted again by accident', () => {
      expect(hasUsedTrial(trial)).toBe(true);
      expect(hasUsedTrial({ trialStartedAt: null, trialEndsAt: null })).toBe(
        false,
      );
      expect(toTrialInfo({ trialStartedAt: null, trialEndsAt: null })).toBe(
        null,
      );
    });
  });
});
