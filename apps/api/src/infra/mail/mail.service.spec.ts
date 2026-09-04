import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';

interface SentEmail {
  to: string;
  subject: string;
  html: string;
}

const sendMock = jest.fn<Promise<{ data: { id: string } }>, [SentEmail]>();
sendMock.mockResolvedValue({ data: { id: 'email-1' } });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

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

  describe('with a configured Resend API key', () => {
    let service: MailService;

    beforeEach(async () => {
      sendMock.mockClear();
      const moduleRef = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: { get: () => 're_test_key' } },
        ],
      }).compile();

      service = moduleRef.get(MailService);
    });

    // Regression test for a stored-HTML-injection finding: customerName comes
    // straight from the public, unauthenticated booking form, and was being
    // interpolated into these HTML emails unescaped. A malicious value could
    // therefore inject arbitrary markup — e.g. a spoofed link — into an email
    // landing in someone else's inbox (the professional's, for a booking they
    // did not create). See MailService / html.util.ts.
    it('escapes an HTML-injection payload in customerName before it reaches the professional email', async () => {
      const maliciousName =
        '<a href="https://evil.example/login">Actualiza tu contraseña</a>';

      await service.sendBookingRescheduledToProfessional({
        to: 'profesional@example.com',
        professionalName: 'Ana Estilista',
        customerName: maliciousName,
        serviceName: 'Corte de cabello',
        oldStartAt: new Date('2026-08-01T14:00:00.000Z'),
        newStartAt: new Date('2026-08-02T14:00:00.000Z'),
        timezone: 'America/Bogota',
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      const { html } = sendMock.mock.calls[0][0];
      expect(html).not.toContain('<a href="https://evil.example/login">');
      expect(html).toContain(
        '&lt;a href=&quot;https://evil.example/login&quot;&gt;',
      );
    });

    it('escapes an HTML-injection payload in the customer-facing confirmation email too', async () => {
      const maliciousService = '<img src=x onerror=alert(1)>';

      await service.sendBookingConfirmation({
        to: 'cliente@example.com',
        customerName: 'María',
        businessName: 'Salón Bonito',
        serviceName: maliciousService,
        startAt: new Date('2026-08-01T14:00:00.000Z'),
        timezone: 'America/Bogota',
        cancellationToken: 'token-123',
      });

      const { html } = sendMock.mock.calls[0][0];
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });
  });
});
