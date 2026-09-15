import type { AuthUser } from '@agendya/types';

export function isSuperAdmin(
  user: Partial<Pick<AuthUser, 'role'>> | null | undefined,
): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export function isPendingAccess(
  user: Partial<Pick<AuthUser, 'accessStatus'>> | null | undefined,
): boolean {
  return user?.accessStatus === 'PENDING';
}

export function postAuthPath(
  user:
    | Partial<Pick<AuthUser, 'role' | 'accessStatus'>>
    | null
    | undefined,
): string {
  if (isPendingAccess(user)) {
    return '/acceso-pendiente';
  }
  return isSuperAdmin(user) ? '/dashboard' : '/dashboard/profile';
}
