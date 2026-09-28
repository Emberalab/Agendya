import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateManualBookingInput } from '@agendya/types';
import { createManualBooking } from '../api';
import { PROFILE_QUERY_KEY } from '../../professionals/hooks/useProfile';

export function useCreateManualBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateManualBookingInput) => createManualBooking(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'agenda'] });
      // Refreshes the monthly usage bar.
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
