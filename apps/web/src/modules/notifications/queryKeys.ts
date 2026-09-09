import type { InfiniteData } from '@tanstack/react-query';
import type { Notification, NotificationListResponse } from '@agendya/types';

/** `useInfiniteQuery` cache for the notification centre list. */
export const NOTIFICATIONS_LIST_KEY = ['notifications', 'list'] as const;

/** `useQuery` cache for the bell's unread badge. */
export const UNREAD_COUNT_KEY = ['notifications', 'unread'] as const;

export const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationListData = InfiniteData<
  NotificationListResponse,
  string | null
>;

/**
 * Applies `fn` to every notification across every loaded page, returning a new
 * cache object (or the same reference when nothing changed). Used by the
 * optimistic mark-read mutations and the real-time prepend.
 */
export function mapNotifications(
  data: NotificationListData | undefined,
  fn: (n: Notification) => Notification,
): NotificationListData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map(fn),
    })),
  };
}

/** Prepends a freshly-received notification to the first page, de-duplicated. */
export function prependNotification(
  data: NotificationListData | undefined,
  notification: Notification,
): NotificationListData | undefined {
  if (!data || data.pages.length === 0) return data;
  const alreadyThere = data.pages.some((page) =>
    page.items.some((n) => n.id === notification.id),
  );
  if (alreadyThere) return data;
  const [first, ...rest] = data.pages;
  return {
    ...data,
    pages: [{ ...first, items: [notification, ...first.items] }, ...rest],
  };
}
