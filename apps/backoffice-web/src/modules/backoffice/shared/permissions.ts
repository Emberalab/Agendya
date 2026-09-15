import type { InternalRole } from '@agendya/types';

/**
 * Mirrors `apps/backoffice-api/src/modules/backoffice/common/permissions.ts`. This copy
 * is UX-only (hide/disable a control the API would reject anyway) — the API
 * is the actual boundary, never this file.
 */
export type Permission =
  | 'VIEW'
  | 'MUTATE_TICKETS'
  | 'ASSIGN_ANY_TICKET'
  | 'MANAGE_INTERNAL_USERS';

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
  role: InternalRole | undefined,
  permission: Permission,
): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<InternalRole, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  SUPPORT: 'Soporte',
  READ_ONLY: 'Solo lectura',
};
