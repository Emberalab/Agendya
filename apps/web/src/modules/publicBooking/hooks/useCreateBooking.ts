import type { CreateBookingInput } from '@agendya/types';
import { useMutation } from '@tanstack/react-query';
import { createPublicBooking } from '../api';

export function useCreateBooking(slug: string) {
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createPublicBooking(slug, input),
  });
}
