import type { CreateBookingInput } from '@agendya/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBookingByToken } from '../api';

export function useUpdateBookingByToken(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBookingInput) =>
      updateBookingByToken(token, input),
    onSuccess: (data) => {
      queryClient.setQueryData(['public', 'bookings', token], data);
    },
  });
}
