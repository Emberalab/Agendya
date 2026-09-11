import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteReadNotifications } from '../api';
import {
  NOTIFICATIONS_LIST_KEY,
  removeReadNotifications,
  type NotificationListData,
} from '../queryKeys';

/**
 * Bulk-deletes every read notification. Not optimistic — it runs behind a
 * confirmation dialog and the list is pruned from cache once the server
 * confirms. The unread badge is never touched: read rows do not count toward
 * it, and the API only ever removes read rows.
 */
export function useDeleteReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReadNotifications,
    onSuccess: () => {
      queryClient.setQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
        (data) => removeReadNotifications(data),
      );
    },
  });
}
