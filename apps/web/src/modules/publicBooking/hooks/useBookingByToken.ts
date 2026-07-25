import { useQuery } from '@tanstack/react-query';
import { getBookingByToken } from '../api';

export function useBookingByToken(token: string) {
  return useQuery({
    queryKey: ['public', 'bookings', token],
    queryFn: () => getBookingByToken(token),
    retry: false,
  });
}
