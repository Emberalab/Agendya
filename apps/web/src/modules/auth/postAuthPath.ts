import type { AuthUser } from '@agendya/types';

export function isSuperAdmin(
  user: Partial<Pick<AuthUser, 'role'>> | null | undefined,
): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export function postAuthPath(
  user: Partial<Pick<AuthUser, 'role'>> | null | undefined,
): string {
  return isSuperAdmin(user) ? '/dashboard' : '/dashboard/profile';
}
