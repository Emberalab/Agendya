import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useBackofficeAuthStore } from '../auth/backofficeAuthStore';
import { roleHasPermission, type Permission } from './permissions';

/**
 * Client-side convenience only — the API rejects the equivalent request
 * regardless. This just keeps a staff member without the permission from
 * landing on a page that will only show them errors.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const role = useBackofficeAuthStore((state) => state.user?.role);
  if (!roleHasPermission(role, permission)) {
    return <Navigate to="/backoffice" replace />;
  }
  return <>{children}</>;
}
