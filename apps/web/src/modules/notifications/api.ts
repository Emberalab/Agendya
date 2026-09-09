import type {
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
