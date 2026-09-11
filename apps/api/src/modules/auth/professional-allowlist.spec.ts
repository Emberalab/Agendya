import { ForbiddenException } from '@nestjs/common';
import {
  PROFESSIONAL_EMAIL_ALLOWLIST,
  assertProfessionalEmailAllowed,
  parseEmailAllowlist,
  resolveProfessionalAllowlist,
} from './professional-allowlist';

describe('professional-allowlist', () => {
  const beta = PROFESSIONAL_EMAIL_ALLOWLIST.production[0];

  it('parses a comma-separated list case-insensitively', () => {
    expect(parseEmailAllowlist('  A@X.com, b@y.com ')).toEqual([
      'a@x.com',
      'b@y.com',
    ]);
  });

  it('is off locally when no Railway env or override is set', () => {
    expect(resolveProfessionalAllowlist({})).toBeNull();
  });

  it('uses the production array on Railway production', () => {
    expect(
      resolveProfessionalAllowlist({ RAILWAY_ENVIRONMENT_NAME: 'production' }),
    ).toEqual([...PROFESSIONAL_EMAIL_ALLOWLIST.production]);
  });

  it('uses the development array on Railway dev', () => {
    expect(
      resolveProfessionalAllowlist({ RAILWAY_ENVIRONMENT_NAME: 'dev' }),
    ).toEqual([...PROFESSIONAL_EMAIL_ALLOWLIST.dev]);
  });

  it('lets PROFESSIONAL_EMAIL_ALLOWLIST override the arrays', () => {
    expect(
      resolveProfessionalAllowlist({
        RAILWAY_ENVIRONMENT_NAME: 'production',
        PROFESSIONAL_EMAIL_ALLOWLIST: 'other@agendya.co',
      }),
    ).toEqual(['other@agendya.co']);
  });

  it('treats an empty override as open signup', () => {
    expect(
      resolveProfessionalAllowlist({
        RAILWAY_ENVIRONMENT_NAME: 'production',
        PROFESSIONAL_EMAIL_ALLOWLIST: '',
      }),
    ).toBeNull();
  });

  it('allows listed emails and forbids others', () => {
    const env = { RAILWAY_ENVIRONMENT_NAME: 'production' };
    expect(() => assertProfessionalEmailAllowed(beta, env)).not.toThrow();
    expect(() =>
      assertProfessionalEmailAllowed(beta.toUpperCase(), env),
    ).not.toThrow();
    expect(() =>
      assertProfessionalEmailAllowed('intruso@gmail.com', env),
    ).toThrow(ForbiddenException);
  });
});
