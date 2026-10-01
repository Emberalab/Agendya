import {
  resolveServicePlanChange,
  type ServicePlanSlot,
} from './service-plan-limit';

const NOW = new Date('2026-09-28T00:00:00.000Z');

function slots(
  ...entries: [id: string, locked: boolean, enabledAt?: string][]
): ServicePlanSlot[] {
  return entries.map(([id, planLocked, enabledAt]) => ({
    id,
    planLocked,
    planEnabledAt: enabledAt ? new Date(enabledAt) : null,
  }));
}

describe('resolveServicePlanChange', () => {
  it('downgrading 6 enabled services to a limit of 3 keeps the first 3 of the catalog', () => {
    const services = slots(
      ['s1', false, '2026-01-06'],
      ['s2', false, '2026-01-05'],
      ['s3', false, '2026-01-04'],
      ['s4', false, '2026-01-03'],
      ['s5', false, '2026-01-02'],
      ['s6', false, '2026-01-01'],
    );

    const { lockIds, enable } = resolveServicePlanChange(services, 3, NOW);

    expect(lockIds).toEqual(['s4', 's5', 's6']);
    expect(enable.map((e) => e.id)).toEqual(['s1', 's2', 's3']);
    // Restamped in catalog order so the FIFO swap drops s1 first.
    expect(enable[0].planEnabledAt < enable[1].planEnabledAt).toBe(true);
    expect(enable[1].planEnabledAt < enable[2].planEnabledAt).toBe(true);
  });

  it('unlocks everything on an unlimited plan', () => {
    const services = slots(['s1', false], ['s2', true], ['s3', true]);

    const { lockIds, enable } = resolveServicePlanChange(services, null, NOW);

    expect(lockIds).toEqual([]);
    expect(enable.map((e) => e.id)).toEqual(['s2', 's3']);
  });

  it('fills free slots with locked services in catalog order', () => {
    const services = slots(
      ['s1', true],
      ['s2', false, '2026-01-01'],
      ['s3', true],
      ['s4', true],
    );

    const { lockIds, enable } = resolveServicePlanChange(services, 3, NOW);

    expect(lockIds).toEqual([]);
    expect(enable.map((e) => e.id)).toEqual(['s1', 's3']);
  });

  it('changes nothing when already within the limit', () => {
    const services = slots(
      ['s1', false, '2026-01-01'],
      ['s2', false, '2026-01-02'],
      ['s3', false, '2026-01-03'],
      ['s4', true],
    );

    expect(resolveServicePlanChange(services, 3, NOW)).toEqual({
      lockIds: [],
      enable: [],
    });
  });
});
