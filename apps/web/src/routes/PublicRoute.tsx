import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../modules/auth/authStore';

export function PublicRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? (
    <Navigate to="/dashboard/profile" replace />
  ) : (
    <Outlet />
  );
}
