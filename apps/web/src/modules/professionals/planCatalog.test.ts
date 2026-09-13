import { describe, expect, it } from 'vitest';
import {
  BILLING_GRACE_DAYS,
  PLAN_PRICE_COP,
  PLAN_SERVICE_LIMITS,
  hasFeature,
  formatPlanWithInterval,
  planBillingOffers,
  planPeriodEnd,
  planPeriodStart,
  missingFeatureIds,
  pickMissingFeatures,
  wompiFeeBreakdown,
} from '@agendya/types';

describe('plan feature catalog', () => {
  it('keeps the free-plan service cap at 3', () => {
    expect(PLAN_SERVICE_LIMITS.FREE).toBe(3);
    expect(PLAN_SERVICE_LIMITS.BASIC).toBe(10);
    expect(PLAN_SERVICE_LIMITS.ADVANCED).toBeNull();
  });

  it('locks advanced features on the free plan', () => {
    expect(hasFeature('FREE', 'publicPage')).toBe(true);
    expect(hasFeature('FREE', 'smsNotifications')).toBe(false);
    expect(hasFeature('BASIC', 'emailNotifications')).toBe(true);
    expect(hasFeature('BASIC', 'automaticScheduling')).toBe(false);
  });

  it('prioritizes a nearly-full service quota in Te falta', () => {
    const items = pickMissingFeatures('FREE', {
      serviceCount: 3,
      bookingsThisMonth: 0,
      seed: 'same-pro',
      now: new Date('2026-09-11T00:00:00.000Z'),
    });
    expect(items[0]?.id).toBe('maxServices');
    expect(items).toHaveLength(3);
  });

  it('rotates the rest of Te falta by week and professional', () => {
    const weekA = pickMissingFeatures('FREE', {
      seed: 'pro-a',
      now: new Date('2026-01-05T00:00:00.000Z'),
    }).map((item) => item.id);
    const weekB = pickMissingFeatures('FREE', {
      seed: 'pro-a',
      now: new Date('2026-01-12T00:00:00.000Z'),
    }).map((item) => item.id);
    const otherPro = pickMissingFeatures('FREE', {
      seed: 'pro-b',
      now: new Date('2026-01-05T00:00:00.000Z'),
    }).map((item) => item.id);

    expect(weekA).not.toEqual(weekB);
    expect(weekA).not.toEqual(otherPro);
    expect(missingFeatureIds('BUSINESS')).toEqual([]);
  });
});

describe('Wompi billing catalog', () => {
  it('matches the public 2.65% + $700 + IVA example on $100.000', () => {
    const fee = wompiFeeBreakdown(100_000);
    expect(fee.percentCop).toBe(2_650);
    expect(fee.fixedCop).toBe(700);
    expect(fee.ivaCop).toBe(636.5);
    expect(fee.wompiCop).toBe(3_986.5);
    expect(fee.netCop).toBe(96_013.5);
  });

  it('keeps Básico monthly net at or above the $19.900 mockup', () => {
    const fee = wompiFeeBreakdown(PLAN_PRICE_COP.BASIC.monthly);
    expect(PLAN_PRICE_COP.BASIC.monthly).toBe(21_900);
    expect(fee.netCop).toBeGreaterThanOrEqual(19_900);
  });

  it('prices annual below 12 monthly charges because Wompi bills the fixed fee once', () => {
    expect(PLAN_PRICE_COP.BASIC.annual).toBeLessThan(
      PLAN_PRICE_COP.BASIC.monthly * 12,
    );
    expect(BILLING_GRACE_DAYS).toBe(3);
  });

  it('shows how much the professional saves by paying the year', () => {
    const basic = planBillingOffers().find((row) => row.plan === 'BASIC');
    expect(basic?.customerSavesCop).toBe(
      PLAN_PRICE_COP.BASIC.monthly * 12 - PLAN_PRICE_COP.BASIC.annual,
    );
    expect(basic?.customerSavesCop).toBeGreaterThan(0);
    expect(basic?.twelveMonthlyNetCop).toBe(basic.monthlyFee.netCop * 12);
  });

  it('labels the paid cycle next to the plan name', () => {
    expect(formatPlanWithInterval('BASIC', 'monthly')).toBe('Básico mensual');
    expect(formatPlanWithInterval('BASIC', 'annual')).toBe('Básico anual');
    expect(formatPlanWithInterval('FREE', null)).toBe('Gratuito');
  });

  it('ends a paid window one month or one year later, clamping month-end', () => {
    const from = new Date('2026-01-31T15:00:00.000Z');
    expect(planPeriodEnd(from, 'monthly').toISOString()).toBe(
      '2026-02-28T15:00:00.000Z',
    );
    expect(
      planPeriodEnd(new Date('2026-09-12T20:00:00.000Z'), 'annual').toISOString(),
    ).toBe('2027-09-12T20:00:00.000Z');
    expect(
      planPeriodStart(
        new Date('2026-10-12T20:00:00.000Z'),
        'monthly',
      ).toISOString(),
    ).toBe('2026-09-12T20:00:00.000Z');
  });
});
