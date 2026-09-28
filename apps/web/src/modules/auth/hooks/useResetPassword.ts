import { useMutation } from '@tanstack/react-query';
import type { ResetPasswordInput } from '@agendya/types';
import { resetPassword } from '../api';

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}
