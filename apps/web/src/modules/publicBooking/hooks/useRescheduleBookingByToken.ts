import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rescheduleBookingByToken } from '../api';

export function useRescheduleBookingByToken(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newStartAt: string) => rescheduleBookingByToken(token, newStartAt),
    onSuccess: (data) => {
      queryClient.setQueryData(['public', 'bookings', token], data);
    },
  });
}
