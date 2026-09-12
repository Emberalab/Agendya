import { describe, expect, it } from 'vitest';
import {
  hasFeature,
  missingFeatureIds,
  pickMissingFeatures,
  PLAN_SERVICE_LIMITS,
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
