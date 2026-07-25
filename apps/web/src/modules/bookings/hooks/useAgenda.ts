import { useQuery } from '@tanstack/react-query';
import { listAgenda } from '../api';

export function useAgenda(from: string, to: string) {
  return useQuery({
    queryKey: ['bookings', 'agenda', from, to],
    queryFn: () => listAgenda(from, to),
  });
}
