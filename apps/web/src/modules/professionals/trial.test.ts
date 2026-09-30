import { describe, expect, it } from 'vitest';
import { formatTrialDate, trialRemainingLabel } from './trial';

const endsAt = '2026-10-01T15:00:00.000Z';
const DAY = 24 * 60 * 60 * 1000;
const at = (msBeforeEnd: number) =>
  new Date(new Date(endsAt).getTime() - msBeforeEnd);

describe('trial display helpers', () => {
  it('counts remaining days, rounding partial days up', () => {
    expect(trialRemainingLabel({ endsAt }, at(30 * DAY))).toBe('30 días');
    expect(trialRemainingLabel({ endsAt }, at(11.5 * DAY))).toBe('12 días');
    expect(trialRemainingLabel({ endsAt }, at(1.5 * DAY))).toBe('2 días');
    expect(trialRemainingLabel({ endsAt }, at(DAY))).toBe('1 día');
    expect(trialRemainingLabel({ endsAt }, at(5 * 60 * 60 * 1000))).toBe(
      'menos de un día',
    );
  });

  it("formats the end date in the professional's time zone", () => {
    // 04:59 UTC on 2 Oct is still 1 Oct in Bogotá (UTC-5).
    expect(formatTrialDate('2026-10-02T04:59:00.000Z', 'America/Bogota')).toBe(
      '1 de octubre',
    );
    expect(
      formatTrialDate('2026-10-02T04:59:00.000Z', 'America/Bogota', true),
    ).toBe('1 de octubre de 2026');
  });
});
