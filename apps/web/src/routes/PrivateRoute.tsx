import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../modules/auth/authStore';
import { useAuthRevalidation } from '../modules/auth/hooks/useAuthRevalidation';

export function PrivateRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);

  // Revalidate user from backend to ensure accessStatus is fresh
  useAuthRevalidation();

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
