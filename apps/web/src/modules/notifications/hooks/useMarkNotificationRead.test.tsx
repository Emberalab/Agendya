import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@agendya/types';
import { useMarkNotificationRead } from './useMarkNotificationRead';
import * as api from '../api';
import {
  NOTIFICATIONS_LIST_KEY,
  UNREAD_COUNT_KEY,
  type NotificationListData,
} from '../queryKeys';

vi.mock('../api');

function unread(id: string): Notification {
  return {
    id,
    type: 'APPOINTMENT_CREATED',
    title: 'Nueva cita',
    body: 'body',
    data: {
      bookingId: `b-${id}`,
      customerName: 'Ana',
      serviceName: 'Corte',
      startAt: '2099-08-03T14:00:00.000Z',
    },
    readAt: null,
    createdAt: '2099-08-03T13:55:00.000Z',
  };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const listData: NotificationListData = {
    pageParams: [null],
    pages: [{ items: [unread('n1'), unread('n2')], nextCursor: null }],
  };
  queryClient.setQueryData(NOTIFICATIONS_LIST_KEY, listData);
  queryClient.setQueryData(UNREAD_COUNT_KEY, 2);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
  return { queryClient, result };
}

const readAtOf = (queryClient: QueryClient, id: string) =>
  queryClient
    .getQueryData<NotificationListData>(NOTIFICATIONS_LIST_KEY)
    ?.pages[0].items.find((n) => n.id === id)?.readAt ?? null;

afterEach(() => vi.resetAllMocks());

describe('useMarkNotificationRead', () => {
  it('optimistically flips the row to read and decrements the badge', async () => {
    vi.mocked(api.markNotificationRead).mockResolvedValue({
      ...unread('n1'),
      readAt: new Date().toISOString(),
    });
    const { queryClient, result } = setup();

    result.current.mutate('n1');

    await waitFor(() => expect(readAtOf(queryClient, 'n1')).not.toBeNull());
    expect(queryClient.getQueryData(UNREAD_COUNT_KEY)).toBe(1);
    expect(readAtOf(queryClient, 'n2')).toBeNull();
  });

  it('rolls back the cache when the request fails', async () => {
    vi.mocked(api.markNotificationRead).mockRejectedValue(new Error('nope'));
    const { queryClient, result } = setup();

    result.current.mutate('n1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readAtOf(queryClient, 'n1')).toBeNull();
    expect(queryClient.getQueryData(UNREAD_COUNT_KEY)).toBe(2);
  });
});
