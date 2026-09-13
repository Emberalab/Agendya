import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { WompiClient } from './wompi.client';

describe('WompiClient', () => {
  it('refuses production keys while sandbox mode is on', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WompiClient,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'wompi.publicKey') return 'pub_prod_not-a-real-key';
              if (key === 'wompi.integrityKey') return 'prod_integrity_x';
              if (key === 'wompi.eventsSecret') return 'prod_events_x';
              if (key === 'wompi.sandbox') return true;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    const client = moduleRef.get(WompiClient);
    expect(() => client.requireCheckoutKeys()).toThrow(
      ServiceUnavailableException,
    );
  });
});
