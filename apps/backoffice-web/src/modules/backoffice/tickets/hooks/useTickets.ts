import { useInfiniteQuery } from '@tanstack/react-query';
import type { TicketListQuery } from '@agendya/types';
import { listTickets } from '../api';

export const TICKETS_QUERY_KEY = ['backoffice', 'tickets'] as const;

// Cursor-paginated, like the trials list. This used to be a single
// `useQuery`, so the queue silently stopped at the API's default page size
// (30) with no indication that older tickets existed.
export function useTickets(filters: Partial<TicketListQuery>) {
  return useInfiniteQuery({
    queryKey: [...TICKETS_QUERY_KEY, filters],
    queryFn: ({ pageParam }) => listTickets({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
