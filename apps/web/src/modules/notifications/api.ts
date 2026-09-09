import type {
  DeleteNotificationsResponse,
  MarkAllReadResponse,
  Notification,
  NotificationListResponse,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function listNotifications(params: {
  cursor?: string;
  limit?: number;
}): Promise<NotificationListResponse> {
  const { data } = await apiClient.get<NotificationListResponse>(
    '/notifications',
    { params: { cursor: params.cursor, limit: params.limit } },
  );
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>(
    '/notifications/unread-count',
  );
  return data.count;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(
    `/notifications/${id}/read`,
  );
  return data;
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResponse> {
  const { data } = await apiClient.patch<MarkAllReadResponse>(
    '/notifications/read-all',
  );
  return data;
}

/** Deletes one already-read notification. Server enforces ownership + read-only. */
export async function deleteNotification(
  id: string,
): Promise<DeleteNotificationsResponse> {
  const { data } = await apiClient.delete<DeleteNotificationsResponse>(
    `/notifications/${id}`,
  );
  return data;
}

/** Deletes every read notification for the authenticated professional. */
export async function deleteReadNotifications(): Promise<DeleteNotificationsResponse> {
  const { data } = await apiClient.delete<DeleteNotificationsResponse>(
    '/notifications/read',
  );
  return data;
}
