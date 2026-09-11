import { ForbiddenException } from '@nestjs/common';

/**
 * Closed beta: only these emails may register or log in as professionals.
 * Railway `start:prod` runs in both environments, so we key off
 * `RAILWAY_ENVIRONMENT_NAME` (`production` vs `dev`), not `NODE_ENV`.
 *
 * Local / CI leave both unset → allowlist is off (open signup).
 * `PROFESSIONAL_EMAIL_ALLOWLIST` (comma-separated) overrides the arrays.
 * Set it to empty to force the list open even on Railway.
 */
export const PROFESSIONAL_EMAIL_ALLOWLIST = {
  production: [
    'hjose0650@gmail.com',
    'afz.0228@gmail.com',
    'jorgeemherrera@gmail.com',
  ],
  dev: [
    'hjose0650@gmail.com',
    'afz.0228@gmail.com',
    'jorgeemherrera@gmail.com',
  ],
} as const;

export const WAITLIST_REQUIRED_CODE = 'WAITLIST_REQUIRED';

export function parseEmailAllowlist(raw: string | undefined): string[] {
  if (raw === undefined) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function resolveProfessionalAllowlist(
  env: NodeJS.ProcessEnv = process.env,
): string[] | null {
  if (env.PROFESSIONAL_EMAIL_ALLOWLIST !== undefined) {
    const parsed = parseEmailAllowlist(env.PROFESSIONAL_EMAIL_ALLOWLIST);
    return parsed.length > 0 ? parsed : null;
  }

  const railwayEnv = env.RAILWAY_ENVIRONMENT_NAME ?? '';
  if (railwayEnv === 'production') {
    return [...PROFESSIONAL_EMAIL_ALLOWLIST.production];
  }
  if (railwayEnv === 'dev') {
    return [...PROFESSIONAL_EMAIL_ALLOWLIST.dev];
  }

  return null;
}

export function assertProfessionalEmailAllowed(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const allowlist = resolveProfessionalAllowlist(env);
  if (!allowlist) {
    return;
  }

  if (!allowlist.includes(email.trim().toLowerCase())) {
    throw new ForbiddenException({
      code: WAITLIST_REQUIRED_CODE,
      message:
        'El acceso está en periodo de prueba. Únete a la lista de espera.',
    });
  }
}
