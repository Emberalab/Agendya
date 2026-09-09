import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@agendya/types';
import { NotificationCenter } from './NotificationCenter';
import * as api from './api';

vi.mock('./api');

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

function notif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    type: 'APPOINTMENT_CREATED',
    title: 'Nueva cita',
    body: 'Ana reservo Corte de cabello',
    data: {
      bookingId: 'b1',
      customerName: 'Ana',
      serviceName: 'Corte de cabello',
      startAt: '2099-08-03T14:00:00.000Z',
    },
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const onClose = vi.fn();

function renderCenter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationCenter onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.markNotificationRead).mockResolvedValue(
    notif({ readAt: new Date().toISOString() }),
  );
  vi.mocked(api.markAllNotificationsRead).mockResolvedValue({ updated: 1 });
});

afterEach(() => {
  vi.resetAllMocks();
  onClose.mockReset();
  navigate.mockReset();
});

describe('NotificationCenter', () => {
  it('shows the empty state when there are no notifications', async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    renderCenter();
    expect(
      await screen.findByText('No tienes notificaciones'),
    ).toBeInTheDocument();
  });

  it('renders read and unread rows with a non-colour-only distinction', async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [
        notif({ id: 'unread-1', title: 'Nueva cita', readAt: null }),
        notif({
          id: 'read-1',
          title: 'Cita anterior',
          readAt: '2099-01-01T00:00:00.000Z',
        }),
      ],
      nextCursor: null,
    });
    renderCenter();

    const unreadRow = await screen.findByRole('button', {
      name: /^Sin leer\. Nueva cita\./,
    });
    expect(unreadRow).toBeInTheDocument();
    expect(within(unreadRow).getByText('Nuevo')).toBeInTheDocument();

    const readRow = screen.getByRole('button', { name: /^Cita anterior\./ });
    expect(within(readRow).queryByText('Nuevo')).not.toBeInTheDocument();
  });

  it('recovers from a load error with the retry button', async () => {
    vi.mocked(api.listNotifications)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ items: [notif()], nextCursor: null });
    const user = userEvent.setup();
    renderCenter();

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('button', { name: /Nueva cita/ }),
    ).toBeInTheDocument();
  });

  it('marks all as read', async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [notif({ readAt: null })],
      nextCursor: null,
    });
    const user = userEvent.setup();
    renderCenter();

    await screen.findByRole('button', { name: /Nueva cita/ });
    await user.click(
      screen.getByRole('button', { name: 'Marcar todas como leídas' }),
    );

    expect(api.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it('marks an unread item read, navigates, and closes on activation', async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [notif({ id: 'n1', readAt: null })],
      nextCursor: null,
    });
    const user = userEvent.setup();
    renderCenter();

    await user.click(await screen.findByRole('button', { name: /Nueva cita/ }));

    expect(vi.mocked(api.markNotificationRead).mock.calls[0][0]).toBe('n1');
    expect(navigate).toHaveBeenCalledWith(
      '/dashboard/agenda?booking=b1&date=2099-08-03',
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('paginates with "Ver más"', async () => {
    vi.mocked(api.listNotifications)
      .mockResolvedValueOnce({
        items: [notif({ id: 'a' }), notif({ id: 'b' })],
        nextCursor: 'cursor-1',
      })
      .mockResolvedValueOnce({ items: [notif({ id: 'c' })], nextCursor: null });
    const user = userEvent.setup();
    renderCenter();

    await user.click(await screen.findByRole('button', { name: 'Ver más' }));

    await waitFor(() =>
      expect(api.listNotifications).toHaveBeenLastCalledWith({
        cursor: 'cursor-1',
        limit: 20,
      }),
    );
  });

  it('closes on Escape', async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    const user = userEvent.setup();
    renderCenter();
    await screen.findByText('No tienes notificaciones');

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
