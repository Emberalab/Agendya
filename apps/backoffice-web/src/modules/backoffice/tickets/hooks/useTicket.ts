import { useQuery } from '@tanstack/react-query';
import { getTicket } from '../api';

export const ticketQueryKey = (id: string) => ['backoffice', 'tickets', id] as const;

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketQueryKey(id),
    queryFn: () => getTicket(id),
    enabled: !!id,
  });
}
