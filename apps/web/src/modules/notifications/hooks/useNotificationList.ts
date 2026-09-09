import { useInfiniteQuery } from '@tanstack/react-query';
import { listNotifications } from '../api';
import { NOTIFICATIONS_LIST_KEY, NOTIFICATIONS_PAGE_SIZE } from '../queryKeys';

/**
 * Paginated notification feed for the centre. Only fetched while the centre is
 * mounted (i.e. open) — the always-mounted bell relies on `useUnreadCount`
 * alone, so an unopened centre costs no requests. Keyset cursor, so the list
 * stays stable as new notifications arrive at the head.
 */
export function useNotificationList() {
  return useInfiniteQuery({
    queryKey: NOTIFICATIONS_LIST_KEY,
    queryFn: ({ pageParam }) =>
      listNotifications({
        cursor: pageParam ?? undefined,
        limit: NOTIFICATIONS_PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}
