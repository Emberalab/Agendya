import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelBookingByToken } from '../api';

export function useCancelBookingByToken(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelBookingByToken(token),
    onSuccess: (data) => {
      queryClient.setQueryData(['public', 'bookings', token], data);
    },
  });
}
