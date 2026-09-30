import { Navigate, Outlet } from 'react-router-dom';
import { useBackofficeAuthStore } from '../modules/backoffice/auth/backofficeAuthStore';

/** An unauthenticated visit to any route redirects to /backoffice/login. */
export function PrivateRoute() {
  const accessToken = useBackofficeAuthStore((state) => state.accessToken);
  return accessToken ? <Outlet /> : <Navigate to="/backoffice/login" replace />;
}
