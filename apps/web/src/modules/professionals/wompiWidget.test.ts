import { describe, expect, it } from 'vitest';
import { readWompiWidgetResult } from './wompiWidget';

describe('readWompiWidgetResult', () => {
  it('reads a normal widget callback', () => {
    expect(
      readWompiWidgetResult({
        transaction: { id: 'tx-1', status: 'APPROVED' },
      }),
    ).toEqual({
      transaction: { id: 'tx-1', status: 'APPROVED' },
    });
  });

  it('does not throw when Wompi returns a null transaction', () => {
    expect(readWompiWidgetResult({ transaction: null })).toEqual({});
    expect(readWompiWidgetResult(null)).toEqual({});
  });
});
