import { useQuery } from '@tanstack/react-query';
import { getMyTicket } from '../api';

export const myTicketQueryKey = (id: string) => ['support', 'tickets', id] as const;

export function useMyTicket(id: string) {
  return useQuery({
    queryKey: myTicketQueryKey(id),
    queryFn: () => getMyTicket(id),
    enabled: !!id,
  });
}
