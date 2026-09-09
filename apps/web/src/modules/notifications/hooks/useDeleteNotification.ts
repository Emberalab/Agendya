import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@agendya/types';
import { useToastStore } from '../../../shared/notifications/toastStore';
import { deleteNotification } from '../api';
import {
  NOTIFICATIONS_LIST_KEY,
  removeNotification,
  restoreNotification,
  type NotificationListData,
} from '../queryKeys';

/** How long the row stays only optimistically removed before the DELETE fires. */
const UNDO_WINDOW_MS = 5_000;

interface Pending {
  timer: ReturnType<typeof setTimeout>;
  toastId: string;
  notification: Notification;
  pageIndex: number;
}

/**
 * Deletes a single (already-read) notification with a Gmail-style undo: the row
 * is removed from the list cache immediately, a "Deshacer" toast shows for
 * {@link UNDO_WINDOW_MS}, and the network `DELETE` only fires once that window
 * closes. "Deshacer" cancels it and re-inserts the row. A pending delete still
 * commits if the centre unmounts (nothing is silently dropped), and a failed
 * `DELETE` re-inserts the row with an error toast.
 *
 * Only read notifications reach this — the row's delete control is not rendered
 * for unread ones, and the API enforces the same.
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const dismissToast = useToastStore((state) => state.dismiss);
  const pending = useRef(new Map<string, Pending>());

  const restore = useCallback(
    (entry: Pending) => {
      queryClient.setQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
        (data) =>
          restoreNotification(data, entry.notification, entry.pageIndex),
      );
    },
    [queryClient],
  );

  const commit = useCallback(
    async (id: string) => {
      const entry = pending.current.get(id);
      if (!entry) return;
      pending.current.delete(id);
      clearTimeout(entry.timer);
      dismissToast(entry.toastId);
      try {
        await deleteNotification(id);
      } catch {
        restore(entry);
        pushToast({
          title: 'No se pudo eliminar la notificación.',
          durationMs: 5_000,
        });
      }
    },
    [dismissToast, pushToast, restore],
  );

  const undo = useCallback(
    (id: string) => {
      const entry = pending.current.get(id);
      if (!entry) return;
      pending.current.delete(id);
      clearTimeout(entry.timer);
      dismissToast(entry.toastId);
      restore(entry);
    },
    [dismissToast, restore],
  );

  const requestDelete = useCallback(
    (notification: Notification) => {
      if (pending.current.has(notification.id)) return;

      const data = queryClient.getQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
      );
      const pageIndex =
        data?.pages.findIndex((page) =>
          page.items.some((n) => n.id === notification.id),
        ) ?? -1;
      if (pageIndex < 0) return;

      queryClient.setQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
        (current) => removeNotification(current, notification.id),
      );

      const toastId = pushToast({
        title: 'Notificación eliminada',
        description: 'Toca aquí para deshacer',
        durationMs: UNDO_WINDOW_MS + 600,
        onClick: () => undo(notification.id),
      });

      const timer = setTimeout(
        () => void commit(notification.id),
        UNDO_WINDOW_MS,
      );
      pending.current.set(notification.id, {
        timer,
        toastId,
        notification,
        pageIndex,
      });
    },
    [queryClient, pushToast, undo, commit],
  );

  // On unmount, commit every still-pending delete — no more undo, but nothing
  // is lost either.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const [id, entry] of map) {
        clearTimeout(entry.timer);
        void deleteNotification(id).catch(() => undefined);
      }
      map.clear();
    };
  }, []);

  return { requestDelete };
}
