import { useMutation } from '@tanstack/react-query';
import { login } from '../api';
import { useAuthStore } from '../authStore';

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: login,
    onSuccess: setSession,
  });
}
