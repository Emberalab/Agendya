import {
  compactUuid,
  createBillingReference,
  expandUuid,
  parseBillingReference,
} from './billing-reference';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('billing-reference', () => {
  it('round-trips professional, plan and interval', () => {
    const reference = createBillingReference(UUID, 'BASIC', 'monthly');
    expect(parseBillingReference(reference)).toEqual({
      professionalId: UUID,
      plan: 'BASIC',
      interval: 'monthly',
    });
  });

  it('expands a compact uuid', () => {
    expect(expandUuid(compactUuid(UUID))).toBe(UUID);
  });

  it('rejects a foreign reference', () => {
    expect(parseBillingReference('MZQ3X2DE2SMX')).toBeNull();
  });
});
