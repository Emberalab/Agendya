import { useMutation } from '@tanstack/react-query';
import type { ForgotPasswordInput } from '@agendya/types';
import { forgotPassword } from '../api';

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => forgotPassword(input),
  });
}
