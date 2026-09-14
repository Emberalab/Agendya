import { ForbiddenException } from '@nestjs/common';
import {
  assertProfessionalEmailAllowed,
  effectiveAccessStatus,
  parseEmailAllowlist,
  resolveAllowlistPolicy,
  signupAccessStatus,
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

  it('marks unlisted signups PENDING while the env allowlist is on', () => {
    const env = { PROFESSIONAL_EMAIL_ALLOWLIST: 'beta@agendya.test' };
    expect(signupAccessStatus(null, 'intruso@gmail.com', env)).toBe('PENDING');
    expect(signupAccessStatus(null, 'beta@agendya.test', env)).toBe('APPROVED');
    expect(signupAccessStatus('ALLOWLISTED', 'anyone@x.com', env)).toBe(
      'APPROVED',
    );
  });

  it('marks local signups without a grant as PENDING', () => {
    expect(signupAccessStatus(null, 'nuevo@salon.com', {})).toBe('PENDING');
  });

  it('only elevates PENDING when the kill switch is an empty allowlist', () => {
    expect(effectiveAccessStatus('PENDING', {})).toBe('PENDING');
    expect(
      effectiveAccessStatus('PENDING', { PROFESSIONAL_EMAIL_ALLOWLIST: '' }),
    ).toBe('APPROVED');
    expect(
      effectiveAccessStatus('PENDING', {
        PROFESSIONAL_EMAIL_ALLOWLIST: 'a@b.com',
      }),
    ).toBe('PENDING');
    expect(effectiveAccessStatus('DECLINED', {})).toBe('DECLINED');
  });
});
