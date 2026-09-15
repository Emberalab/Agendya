import type { InternalRole } from '@agendya/types';

/**
 * Least-privilege permission matrix for Backoffice staff. Checked
 * server-side on every mutating (and identity-sensitive) route via
 * {@link PermissionGuard} — the frontend hiding a button is a UX nicety
 * only, never the boundary.
 */
export type Permission =
  'VIEW' | 'MUTATE_TICKETS' | 'ASSIGN_ANY_TICKET' | 'MANAGE_INTERNAL_USERS';

const ROLE_PERMISSIONS: Record<InternalRole, readonly Permission[]> = {
  READ_ONLY: ['VIEW'],
  SUPPORT: ['VIEW', 'MUTATE_TICKETS'],
  ADMIN: ['VIEW', 'MUTATE_TICKETS', 'ASSIGN_ANY_TICKET'],
  SUPER_ADMIN: [
    'VIEW',
    'MUTATE_TICKETS',
    'ASSIGN_ANY_TICKET',
    'MANAGE_INTERNAL_USERS',
  ],
};

export function roleHasPermission(
  role: InternalRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
