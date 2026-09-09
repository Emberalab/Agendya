import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification, RealtimeEvent } from '@agendya/types';
import { useNotificationsRealtime } from './useNotificationsRealtime';
import { ToastHost } from '../../../shared/notifications/ToastHost';
import { Announcer } from '../../../shared/a11y/announcer';
import { useToastStore } from '../../../shared/notifications/toastStore';
import { useAuthStore } from '../../auth/authStore';
import {
  NOTIFICATIONS_LIST_KEY,
  UNREAD_COUNT_KEY,
  type NotificationListData,
} from '../queryKeys';

const listeners = new Set<(event: RealtimeEvent) => void>();
const syncToken = vi.fn();

vi.mock('../../../shared/realtime/realtimeClient', () => ({
  realtimeClient: {
    syncToken: (t: string | null) => syncToken(t),
    subscribe: (listener: (event: RealtimeEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

function emit(event: RealtimeEvent) {
  listeners.forEach((l) => l(event));
}

function makeNotification(id: string): Notification {
  return {
    id,
    type: 'APPOINTMENT_CREATED',
    title: 'Nueva cita',
    body: `Ana ${id} reservo Corte de cabello`,
    data: {
      bookingId: `b-${id}`,
      customerName: `Ana ${id}`,
      serviceName: 'Corte de cabello',
      startAt: '2099-08-03T14:00:00.000Z',
    },
    readAt: null,
    createdAt: '2099-08-03T13:55:00.000Z',
  };
}

function event(id: string): RealtimeEvent {
  return { type: 'notification.created', notification: makeNotification(id) };
}

function Harness() {
  useNotificationsRealtime();
  return (
    <>
      <ToastHost />
      <Announcer />
    </>
  );
}

function renderHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient, invalidateSpy };
}

function seedList(queryClient: QueryClient, notifications: Notification[]): void {
  const data: NotificationListData = {
    pageParams: [null],
    pages: [{ items: notifications, nextCursor: null }],
  };
  queryClient.setQueryData(NOTIFICATIONS_LIST_KEY, data);
}

describe('useNotificationsRealtime', () => {
  beforeEach(() => {
    listeners.clear();
    syncToken.mockClear();
    navigate.mockClear();
    useToastStore.getState().clear();
    useAuthStore.setState({ accessToken: 'token', user: null });
  });

  afterEach(() => {
    useToastStore.getState().clear();
  });

  it('syncs the realtime connection with the current auth token', () => {
    renderHarness();
    expect(syncToken).toHaveBeenCalledWith('token');
  });

  it('shows a toast, announces, and refreshes the agenda on notification.created', async () => {
    const { invalidateSpy } = renderHarness();

    emit(event('1'));

    expect(await screen.findByText('Nueva cita')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Notificaciones' })).getByText(
        /Ana 1 reservo Corte de cabello/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /Nueva notificaci.n: Nueva cita/,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['bookings', 'agenda'],
    });
  });

  it('refreshes the unread count so the badge stays accurate', async () => {
    const { invalidateSpy } = renderHarness();

    emit(event('1'));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: UNREAD_COUNT_KEY,
      }),
    );
  });

  it('prepends to the notification-list cache when it is loaded', async () => {
    const { queryClient } = renderHarness();
    seedList(queryClient, [makeNotification('old')]);

    emit(event('new'));

    await waitFor(() => {
      const data = queryClient.getQueryData<NotificationListData>(
        NOTIFICATIONS_LIST_KEY,
      );
      expect(data?.pages[0].items.map((n) => n.id)).toEqual(['new', 'old']);
    });
  });

  it('does not raise a second toast for a repeated notification id', async () => {
    renderHarness();

    emit(event('dupe'));
    emit(event('dupe'));

    await waitFor(() =>
      expect(screen.getAllByText('Nueva cita')).toHaveLength(1),
    );
  });

  it('navigates to the agenda when the toast is clicked', async () => {
    const user = userEvent.setup();
    renderHarness();

    emit(event('1'));
    await user.click(await screen.findByText('Nueva cita'));

    expect(navigate).toHaveBeenCalledWith(
      '/dashboard/agenda?booking=b-1&date=2099-08-03',
    );
  });

  it('ignores unrelated event types', async () => {
    renderHarness();
    emit({ type: 'something.else' } as unknown as RealtimeEvent);
    await waitFor(() => {
      expect(screen.queryByText('Nueva cita')).not.toBeInTheDocument();
    });
  });
});
