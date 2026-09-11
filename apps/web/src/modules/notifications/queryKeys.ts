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

/**
 * Drops one notification from whatever page holds it. `page.nextCursor` is left
 * untouched — it is the keyset cursor of that page's last row and stays valid
 * for "load more" even after an earlier row is removed.
 */
export function removeNotification(
  data: NotificationListData | undefined,
  id: string,
): NotificationListData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((n) => n.id !== id),
    })),
  };
}

/** Drops every read (`readAt !== null`) notification from every page. */
export function removeReadNotifications(
  data: NotificationListData | undefined,
): NotificationListData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((n) => n.readAt === null),
    })),
  };
}

/**
 * Re-inserts a notification (used to undo an optimistic delete) into `pageIndex`,
 * then re-sorts that page by `(createdAt, id)` desc so it lands in the right
 * place even if a real-time notification arrived during the undo window.
 */
export function restoreNotification(
  data: NotificationListData | undefined,
  notification: Notification,
  pageIndex: number,
): NotificationListData | undefined {
  if (!data || !data.pages[pageIndex]) return data;
  const already = data.pages.some((page) =>
    page.items.some((n) => n.id === notification.id),
  );
  if (already) return data;
  return {
    ...data,
    pages: data.pages.map((page, index) =>
      index === pageIndex
        ? {
            ...page,
            items: [...page.items, notification].sort((a, b) =>
              a.createdAt === b.createdAt
                ? b.id.localeCompare(a.id)
                : b.createdAt.localeCompare(a.createdAt),
            ),
          }
        : page,
    ),
  };
}
