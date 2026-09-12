import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../modules/auth/authStore';
import { postAuthPath } from '../modules/auth/postAuthPath';

export function PublicRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  return accessToken ? (
    <Navigate to={postAuthPath(user)} replace />
  ) : (
    <Outlet />
  );
}
