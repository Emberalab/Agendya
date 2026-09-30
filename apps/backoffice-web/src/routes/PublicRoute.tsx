import { Navigate, Outlet } from 'react-router-dom';
import { useBackofficeAuthStore } from '../modules/backoffice/auth/backofficeAuthStore';

/** Keeps an already-signed-in staff member off /backoffice/login. */
export function PublicRoute() {
  const accessToken = useBackofficeAuthStore((state) => state.accessToken);
  return accessToken ? <Navigate to="/backoffice" replace /> : <Outlet />;
}
