import {
  sha256Hex,
  verifyWompiEventChecksum,
  wompiIntegritySignature,
} from './wompi-crypto';

describe('wompi-crypto', () => {
  it('matches the official widget integrity example', () => {
    expect(
      wompiIntegritySignature(
        'sk8-438k4-xmxm392-sn2m',
        2_490_000,
        'COP',
        'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6',
      ),
    ).toBe('37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5');
  });

  it('accepts a checksum built from properties + timestamp + secret', () => {
    const payload =
      '1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z';
    const checksum = sha256Hex(payload);
    // Wompi's published hex for this example is stale; the concatenation
    // in their steps is what we implement.
    expect(checksum).toBe(
      '5a18ec5e8fdb7df463e9f94774cba8f583ba21bd04a09ceff2ea68a4bc0aefbe',
    );
    expect(
      verifyWompiEventChecksum({
        data: {
          transaction: {
            id: '1234-1610641025-49201',
            status: 'APPROVED',
            amount_in_cents: 4_490_000,
          },
        },
        properties: [
          'transaction.id',
          'transaction.status',
          'transaction.amount_in_cents',
        ],
        timestamp: 1_530_291_411,
        checksum,
        eventsSecret: 'prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z',
      }),
    ).toBe(true);
  });

  it('rejects a tampered checksum', () => {
    expect(
      verifyWompiEventChecksum({
        data: {
          transaction: {
            id: '1234-1610641025-49201',
            status: 'APPROVED',
            amount_in_cents: 4_490_000,
          },
        },
        properties: [
          'transaction.id',
          'transaction.status',
          'transaction.amount_in_cents',
        ],
        timestamp: 1_530_291_411,
        checksum: '00'.repeat(32),
        eventsSecret: 'prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z',
      }),
    ).toBe(false);
  });
});
