import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationRead } from '../api';
import {
  mapNotifications,
  NOTIFICATIONS_LIST_KEY,
  UNREAD_COUNT_KEY,
  type NotificationListData,
} from '../queryKeys';

/**
 * Marks one notification read with an optimistic cache update: the list row
 * flips to "read" and the unread badge decrements immediately, rolled back if
 * the request fails. `onSettled` reconciles the count with the server.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY });

      const prevList = queryClient.getQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
      );
      const prevCount =
        queryClient.getQueryData<number>(UNREAD_COUNT_KEY);

      let wasUnread = false;
      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
        (data) =>
          mapNotifications(data, (n) => {
            if (n.id === id && n.readAt === null) {
              wasUnread = true;
              return { ...n, readAt };
            }
            return n;
          }),
      );

      if (wasUnread && typeof prevCount === 'number') {
        queryClient.setQueryData<number>(
          UNREAD_COUNT_KEY,
          Math.max(0, prevCount - 1),
        );
      }

      return { prevList, prevCount };
    },
    onError: (_err, _id, context) => {
      if (context?.prevList !== undefined) {
        queryClient.setQueryData(NOTIFICATIONS_LIST_KEY, context.prevList);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(UNREAD_COUNT_KEY, context.prevCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
