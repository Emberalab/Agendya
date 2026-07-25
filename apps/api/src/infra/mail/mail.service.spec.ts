import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';

describe('MailService', () => {
  describe('without a configured Resend API key', () => {
    let service: MailService;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: { get: () => undefined } },
        ],
      }).compile();

      service = moduleRef.get(MailService);
    });

    it('logs instead of sending, without throwing', async () => {
      await expect(
        service.sendBookingConfirmation({
          to: 'cliente@example.com',
          customerName: 'María',
          businessName: 'Ronda Belleza',
          serviceName: 'Corte de cabello',
          startAt: new Date('2026-08-01T14:00:00.000Z'),
          timezone: 'America/Bogota',
          cancellationToken: 'token-123',
        }),
      ).resolves.toBeUndefined();
    });

    it('does not throw for cancellation or reminder emails either', async () => {
      const params = {
        to: 'cliente@example.com',
        customerName: 'María',
        businessName: 'Ronda Belleza',
        serviceName: 'Corte de cabello',
        startAt: new Date('2026-08-01T14:00:00.000Z'),
        timezone: 'America/Bogota',
      };

      await expect(
        service.sendBookingCancelled(params),
      ).resolves.toBeUndefined();
      await expect(
        service.sendBookingReminder({ ...params, hoursBefore: 24 }),
      ).resolves.toBeUndefined();
    });
  });
});
