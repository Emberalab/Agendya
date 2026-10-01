import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../database/prisma.service';
import type { MailService } from '../../../infra/mail/mail.service';
import type { AuditLogService } from '../audit-log/audit-log.service';
import { BackofficeAuthService } from './backoffice-auth.service';
import { BackofficeGoogleAuthError } from './google-oauth.constants';

function makeService(allowedDomains: string[]) {
  const findUnique = jest.fn().mockResolvedValue(null);
  const prisma = {
    internalUser: { findUnique },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn((key: string) =>
      key === 'google.allowedDomains' ? allowedDomains : undefined,
    ),
  } as unknown as ConfigService;
  const service = new BackofficeAuthService(
    prisma,
    {} as JwtService,
    config,
    {} as MailService,
    {} as AuditLogService,
  );
  return { service, findUnique };
}

describe('BackofficeAuthService.googleLogin — GOOGLE_ALLOWED_DOMAINS', () => {
  it('refuses an email outside the allowed domains before touching the DB', async () => {
    const { service, findUnique } = makeService(['agendya.co']);
    const attempt = service.googleLogin({
      googleId: 'g-1',
      email: 'someone@gmail.com',
      emailVerified: true,
    });
    await expect(attempt).rejects.toBeInstanceOf(BackofficeGoogleAuthError);
    await attempt.catch((err: BackofficeGoogleAuthError) =>
      expect(err.code).toBe('google_not_allowed'),
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('lets an allowed-domain email through to the account lookup', async () => {
    const { service, findUnique } = makeService(['agendya.co']);
    await expect(
      service.googleLogin({
        googleId: 'g-2',
        email: 'staff@agendya.co',
        emailVerified: true,
      }),
    ).rejects.toMatchObject({ code: 'google_no_account' });
    expect(findUnique).toHaveBeenCalled();
  });
});
