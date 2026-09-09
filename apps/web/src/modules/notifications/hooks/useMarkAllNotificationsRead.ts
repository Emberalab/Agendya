import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAllNotificationsRead } from '../api';
import {
  mapNotifications,
  NOTIFICATIONS_LIST_KEY,
  UNREAD_COUNT_KEY,
  type NotificationListData,
} from '../queryKeys';

/**
 * Marks every notification read. Optimistically flips all loaded rows to "read"
 * and zeroes the badge, rolled back on failure.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY });

      const prevList = queryClient.getQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
      );
      const prevCount = queryClient.getQueryData<number>(UNREAD_COUNT_KEY);

      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
        (data) =>
          mapNotifications(data, (n) =>
            n.readAt === null ? { ...n, readAt } : n,
          ),
      );
      queryClient.setQueryData<number>(UNREAD_COUNT_KEY, 0);

      return { prevList, prevCount };
    },
    onError: (_err, _vars, context) => {
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
