import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelBooking } from '../api';

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'agenda'] });
    },
  });
}
