import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../modules/auth/authStore';

export function PrivateRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
