import { ForbiddenException } from '@nestjs/common';
import type { AccessStatus } from '@agendya/types';

export const WAITLIST_REQUIRED_CODE = 'WAITLIST_REQUIRED';

export type PlatformAccessGrant = 'SUPER_ADMIN' | 'ALLOWLISTED';

export type AllowlistPolicy =
  { mode: 'open' } | { mode: 'env'; emails: string[] } | { mode: 'database' };

/**
 * Closed beta access gate.
 *
 * Local / CI leave `PROFESSIONAL_EMAIL_ALLOWLIST` unset → anyone may register,
 * but new accounts are PENDING until Super Admin accepts (or the kill switch).
 * On Railway, grants come from `PlatformAccessEmail` (database).
 * `PROFESSIONAL_EMAIL_ALLOWLIST` (comma-separated) overrides that table.
 * Set it to empty string (`""`) to open the product: stored PENDING is treated
 * as APPROVED without a mass DB update. DECLINED stays out.
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

/**
 * Status written on a new Professional at signup.
 * ONLY grant (SUPER_ADMIN/ALLOWLISTED) or explicit env allowlist → APPROVED.
 * Local unset / mode:open does NOT auto-approve. Always PENDING unless grant/env.
 */
export function signupAccessStatus(
  grant: PlatformAccessGrant | null,
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): AccessStatus {
  if (grant === 'SUPER_ADMIN' || grant === 'ALLOWLISTED') {
    return 'APPROVED';
  }

  const policy = resolveAllowlistPolicy(env);
  const normalizedEmail = email.trim().toLowerCase();
  if (policy.mode === 'env' && policy.emails.includes(normalizedEmail)) {
    return 'APPROVED';
  }

  return 'PENDING';
}

/** Explicit kill switch: `PROFESSIONAL_EMAIL_ALLOWLIST=""`. */
export function isAccessKillSwitchOpen(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.PROFESSIONAL_EMAIL_ALLOWLIST === '';
}

/**
 * Kill switch only: empty `PROFESSIONAL_EMAIL_ALLOWLIST` treats stored PENDING
 * as APPROVED so everyone can enter without a mass update. Local unset does
 * NOT open the gate — PENDING stays pending until Super Admin accepts.
 * DECLINED is never lifted this way.
 */
export function effectiveAccessStatus(
  stored: AccessStatus | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): AccessStatus {
  if (stored === 'DECLINED') {
    return 'DECLINED';
  }
  if (stored === 'PENDING') {
    return isAccessKillSwitchOpen(env) ? 'APPROVED' : 'PENDING';
  }
  return 'APPROVED';
}

/** Public booking pages: only APPROVED unless the kill switch is open. */
export function publicProfessionalAccessFilter(
  env: NodeJS.ProcessEnv = process.env,
): { accessStatus?: 'APPROVED' } {
  return isAccessKillSwitchOpen(env) ? {} : { accessStatus: 'APPROVED' };
}
