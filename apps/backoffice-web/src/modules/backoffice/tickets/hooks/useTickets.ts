import { useQuery } from '@tanstack/react-query';
import type { TicketListQuery } from '@agendya/types';
import { listTickets } from '../api';

export const TICKETS_QUERY_KEY = ['backoffice', 'tickets'] as const;

export function useTickets(filters: Partial<TicketListQuery>) {
  return useQuery({
    queryKey: [...TICKETS_QUERY_KEY, filters],
    queryFn: () => listTickets(filters),
  });
}
