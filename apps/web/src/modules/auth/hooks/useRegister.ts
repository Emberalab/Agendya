import { useMutation } from '@tanstack/react-query';
import { register } from '../api';
import { useAuthStore } from '../authStore';

export function useRegister() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: register,
    onSuccess: setSession,
  });
}
