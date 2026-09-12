import { ForbiddenException } from '@nestjs/common';
import {
  assertProfessionalEmailAllowed,
  parseEmailAllowlist,
  resolveAllowlistPolicy,
  type PlatformAccessGrant,
} from './professional-allowlist';

describe('professional-allowlist', () => {
  const noGrant = () => null;

  it('parses a comma-separated list case-insensitively', () => {
    expect(parseEmailAllowlist('  A@X.com, b@y.com ')).toEqual([
      'a@x.com',
      'b@y.com',
    ]);
  });

  it('is open locally when no Railway env or override is set', () => {
    expect(resolveAllowlistPolicy({})).toEqual({ mode: 'open' });
  });

  it('reads grants from the database on Railway production and dev', () => {
    expect(
      resolveAllowlistPolicy({ RAILWAY_ENVIRONMENT_NAME: 'production' }),
    ).toEqual({ mode: 'database' });
    expect(resolveAllowlistPolicy({ RAILWAY_ENVIRONMENT_NAME: 'dev' })).toEqual(
      { mode: 'database' },
    );
  });

  it('lets PROFESSIONAL_EMAIL_ALLOWLIST override the database', () => {
    expect(
      resolveAllowlistPolicy({
        RAILWAY_ENVIRONMENT_NAME: 'production',
        PROFESSIONAL_EMAIL_ALLOWLIST: 'other@agendya.co',
      }),
    ).toEqual({ mode: 'env', emails: ['other@agendya.co'] });
  });

  it('treats an empty override as open signup', () => {
    expect(
      resolveAllowlistPolicy({
        RAILWAY_ENVIRONMENT_NAME: 'production',
        PROFESSIONAL_EMAIL_ALLOWLIST: '',
      }),
    ).toEqual({ mode: 'open' });
  });

  it('allows listed emails and forbids others when the env override is set', async () => {
    const env = { PROFESSIONAL_EMAIL_ALLOWLIST: 'beta@agendya.test' };
    await expect(
      assertProfessionalEmailAllowed('beta@agendya.test', noGrant, env),
    ).resolves.toBeUndefined();
    await expect(
      assertProfessionalEmailAllowed('BETA@agendya.test', noGrant, env),
    ).resolves.toBeUndefined();
    await expect(
      assertProfessionalEmailAllowed('intruso@gmail.com', noGrant, env),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows a database ALLOWLISTED grant on Railway', async () => {
    const env = { RAILWAY_ENVIRONMENT_NAME: 'production' };
    const lookup = (email: string): PlatformAccessGrant | null =>
      email === 'beta@agendya.test' ? 'ALLOWLISTED' : null;

    await expect(
      assertProfessionalEmailAllowed('beta@agendya.test', lookup, env),
    ).resolves.toBeUndefined();
    await expect(
      assertProfessionalEmailAllowed('intruso@gmail.com', lookup, env),
    ).rejects.toThrow(ForbiddenException);
  });

  it('bypasses any allowlist for a SUPER_ADMIN grant', async () => {
    const env = {
      RAILWAY_ENVIRONMENT_NAME: 'production',
      PROFESSIONAL_EMAIL_ALLOWLIST: 'only-one@allowed.com',
    };
    const lookup = (email: string): PlatformAccessGrant | null =>
      email === 'admin@agendya.test' ? 'SUPER_ADMIN' : null;

    await expect(
      assertProfessionalEmailAllowed('admin@agendya.test', lookup, env),
    ).resolves.toBeUndefined();
    await expect(
      assertProfessionalEmailAllowed('ADMIN@agendya.test', lookup, env),
    ).resolves.toBeUndefined();
    await expect(
      assertProfessionalEmailAllowed('other@agendya.co', lookup, env),
    ).rejects.toThrow(ForbiddenException);
  });
});
