import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/authStore';
import { realtimeClient } from '../../../shared/realtime/realtimeClient';
import { useToastStore } from '../../../shared/notifications/toastStore';
import { announce } from '../../../shared/a11y/announcerStore';
import { routeForNotification } from '../navigation';
import {
  NOTIFICATIONS_LIST_KEY,
  UNREAD_COUNT_KEY,
  prependNotification,
  type NotificationListData,
} from '../queryKeys';

const SEEN_LIMIT = 200;

/**
 * Bridges the shared SSE stream into the notification centre + toast + agenda.
 * Mount once, in the dashboard shell.
 *
 * On `notification.created` it, without any refetch:
 *  - prepends to the notification-list cache (if the centre has been opened),
 *  - bumps the unread-count cache,
 *  - shows a toast that deep-links to the relevant view,
 *  - announces it to screen readers,
 *  - invalidates the agenda queries so the calendar/list reflect the booking.
 *
 * De-duplicates by notification id via a ref that survives StrictMode's
 * mount/unmount/mount.
 */
export function useNotificationsRealtime(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);
  const accessToken = useAuthStore((state) => state.accessToken);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    realtimeClient.syncToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const unsubscribe = realtimeClient.subscribe((event) => {
      if (event.type !== 'notification.created') return;
      const { notification } = event;

      if (seenIds.current.has(notification.id)) return;
      seenIds.current.add(notification.id);
      if (seenIds.current.size > SEEN_LIMIT) {
        seenIds.current = new Set(
          [...seenIds.current].slice(-SEEN_LIMIT),
        );
      }

      // Direct cache update for the list (dedup handles a fetch/event race).
      queryClient.setQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
        (data) => prependNotification(data, notification),
      );
      // The unread badge is a single `{ count }` document. Refetch it rather
      // than optimistically incrementing: an increment double-counts whenever
      // the count was fetched *after* the row was persisted server-side.
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });

      void queryClient.invalidateQueries({ queryKey: ['bookings', 'agenda'] });

      pushToast({
        title: notification.title,
        description: notification.body,
        onClick: () => navigate(routeForNotification(notification)),
      });
      announce(`Nueva notificación: ${notification.title}. ${notification.body}`);
    });

    return unsubscribe;
  }, [accessToken, queryClient, navigate, pushToast]);
}
