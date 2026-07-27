import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RescheduleBookingInput } from '@agendya/types';
import { rescheduleBooking } from '../api';

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RescheduleBookingInput }) =>
      rescheduleBooking(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });
}
