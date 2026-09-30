import { useQuery } from '@tanstack/react-query';
import type { SupportTicketListQuery } from '@agendya/types';
import { listMyTickets } from '../api';

export const MY_TICKETS_QUERY_KEY = ['support', 'tickets'] as const;

export function useMyTickets(query: Partial<SupportTicketListQuery> = {}) {
  return useQuery({
    queryKey: [...MY_TICKETS_QUERY_KEY, query],
    queryFn: () => listMyTickets({ limit: 30, ...query }),
  });
}
