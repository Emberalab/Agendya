import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeBooking } from '../api';

export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeBooking,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'agenda'] });
    },
  });
}
