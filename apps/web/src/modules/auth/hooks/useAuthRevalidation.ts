import { useEffect } from 'react';
import { apiClient } from '../../../shared/api/apiClient';
import { useAuthStore } from '../authStore';
import type { AuthUser } from '@agendya/types';

/**
 * Revalidates the authenticated user from the backend on mount.
 * This ensures that the user's accessStatus is always fresh,
 * preventing stale localStorage data from showing wrong UI.
 */
export function useAuthRevalidation() {
  const { accessToken, updateUser, logout } = useAuthStore();

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const revalidate = async () => {
      try {
        const response = await apiClient.get<AuthUser>('/auth/me');
        // Update all user fields to ensure accessStatus is fresh
        updateUser(response.data);
      } catch (error) {
        // If /auth/me fails (e.g., token expired), clear the session
        console.error('Failed to revalidate user:', error);
        logout();
      }
    };

    void revalidate();
  }, [accessToken, updateUser, logout]);
}
