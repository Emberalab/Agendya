import { ForbiddenException } from '@nestjs/common';

export const WAITLIST_REQUIRED_CODE = 'WAITLIST_REQUIRED';

export type PlatformAccessGrant = 'SUPER_ADMIN' | 'ALLOWLISTED';

export type AllowlistPolicy =
  { mode: 'open' } | { mode: 'env'; emails: string[] } | { mode: 'database' };

/**
 * Closed beta: Railway `start:prod` runs in both environments, so we key off
 * `RAILWAY_ENVIRONMENT_NAME` (`production` vs `dev`), not `NODE_ENV`.
 *
 * Local / CI leave both unset → allowlist is off (open signup).
 * On Railway, allowed emails come from `PlatformAccessEmail` (database).
 * `PROFESSIONAL_EMAIL_ALLOWLIST` (comma-separated) overrides that table.
 * Set it to empty to force signup open even on Railway.
 *
 * A `SUPER_ADMIN` grant always bypasses the list so an env override cannot
 * lock the platform admin out.
 */
export function parseEmailAllowlist(raw: string | undefined): string[] {
  if (raw === undefined) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function resolveAllowlistPolicy(
  env: NodeJS.ProcessEnv = process.env,
): AllowlistPolicy {
  if (env.PROFESSIONAL_EMAIL_ALLOWLIST !== undefined) {
    const parsed = parseEmailAllowlist(env.PROFESSIONAL_EMAIL_ALLOWLIST);
    return parsed.length > 0
      ? { mode: 'env', emails: parsed }
      : { mode: 'open' };
  }

  const railwayEnv = env.RAILWAY_ENVIRONMENT_NAME ?? '';
  if (railwayEnv === 'production' || railwayEnv === 'dev') {
    return { mode: 'database' };
  }

  return { mode: 'open' };
}

export type GrantLookup = (
  normalizedEmail: string,
) => PlatformAccessGrant | null | Promise<PlatformAccessGrant | null>;

export async function assertProfessionalEmailAllowed(
  email: string,
  lookupGrant: GrantLookup,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const grant = await lookupGrant(normalizedEmail);

  if (grant === 'SUPER_ADMIN') {
    return;
  }

  const policy = resolveAllowlistPolicy(env);
  if (policy.mode === 'open') {
    return;
  }

  if (policy.mode === 'env') {
    if (!policy.emails.includes(normalizedEmail)) {
      throwWaitlistRequired();
    }
    return;
  }

  if (!grant) {
    throwWaitlistRequired();
  }
}

function throwWaitlistRequired(): never {
  throw new ForbiddenException({
    code: WAITLIST_REQUIRED_CODE,
    message: 'El acceso está en periodo de prueba. Únete a la lista de espera.',
  });
}
