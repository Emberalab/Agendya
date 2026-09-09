import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const READ_AT = '2099-01-01T00:00:00.000Z';
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
  vi.mocked(api.deleteNotification).mockResolvedValue({ deleted: 1 });
  vi.mocked(api.deleteReadNotifications).mockResolvedValue({ deleted: 2 });
});

afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  onClose.mockReset();
  navigate.mockReset();
});

/** Stubs `matchMedia` so `(prefers-reduced-motion: reduce)` reports `matches`. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((media: string) => ({
      matches,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

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
        notif({ id: 'read-1', title: 'Cita anterior', readAt: READ_AT }),
      ],
      nextCursor: null,
    });
    renderCenter();

    const unreadRow = await screen.findByRole('button', {
      name: /^Sin leer\. Nueva cita\./,
    });
    expect(within(unreadRow).getByText('Nuevo')).toBeInTheDocument();

    const readRow = screen.getByRole('button', { name: /Cita anterior\./ });
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
      await screen.findByRole('button', { name: /Nueva cita\./ }),
    ).toBeInTheDocument();
  });

  it('marks all as read', async () => {
    vi.mocked(api.listNotifications).mockResolvedValue({
      items: [notif({ readAt: null })],
      nextCursor: null,
    });
    const user = userEvent.setup();
    renderCenter();

    await screen.findByRole('button', { name: /Nueva cita\./ });
    await user.click(
      screen.getByRole('button', { name: 'Marcar todas como leídas' }),
    );

    expect(api.markAllNotificationsRead).toHaveBeenCalledTimes(1);
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

  describe('list ⇄ detail navigation', () => {
    it('opens the appointment detail in-panel, ← returns to the list, X closes', async () => {
      vi.mocked(api.listNotifications).mockResolvedValue({
        items: [notif({ id: 'n1', readAt: null })],
        nextCursor: null,
      });
      const user = userEvent.setup();
      renderCenter();

      await user.click(
        await screen.findByRole('button', { name: /Nueva cita\./ }),
      );

      // Marked read, but NOT navigated away and NOT closed.
      expect(vi.mocked(api.markNotificationRead).mock.calls[0][0]).toBe('n1');
      expect(navigate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      // Detail view is shown, inside the same dialog.
      expect(
        screen.getByRole('heading', { name: 'Detalle de la cita' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Corte de cabello')).toBeInTheDocument();

      // ← goes back to the list without closing.
      await user.click(
        screen.getByRole('button', { name: 'Volver a notificaciones' }),
      );
      expect(
        screen.getByRole('heading', { name: 'Notificaciones' }),
      ).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      // Re-open, then "Ver en la agenda" performs the original navigate + close.
      await user.click(screen.getByRole('button', { name: /Nueva cita\./ }));
      await user.click(
        screen.getByRole('button', { name: 'Ver en la agenda →' }),
      );
      expect(navigate).toHaveBeenCalledWith(
        '/dashboard/agenda?booking=b1&date=2099-08-03',
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('deletion', () => {
    it('animates a read row out, then deletes it after the undo window', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(api.listNotifications).mockResolvedValue({
        items: [
          notif({ id: 'unread-1', readAt: null }),
          notif({ id: 'read-1', title: 'Cita anterior', readAt: READ_AT }),
        ],
        nextCursor: null,
      });
      const user = userEvent.setup();
      renderCenter();

      await screen.findByRole('button', { name: /Cita anterior\./ });

      // No delete control on the unread row.
      expect(
        screen.queryByRole('button', {
          name: 'Eliminar notificación: Nueva cita',
        }),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole('button', {
          name: 'Eliminar notificación: Cita anterior',
        }),
      );

      // The row starts its exit animation but is still mounted — nothing
      // committed to the cache or the network yet.
      const row = screen
        .getByRole('button', { name: /Cita anterior\./ })
        .closest('.notif-row') as HTMLElement;
      expect(row).toHaveAttribute('data-exiting', 'true');
      expect(api.deleteNotification).not.toHaveBeenCalled();

      // Animation finishes → optimistic removal + undo toast; DELETE deferred.
      fireEvent.transitionEnd(row.querySelector('.notif-row-inner')!, {
        propertyName: 'opacity',
      });
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /Cita anterior\./ }),
        ).not.toBeInTheDocument(),
      );
      expect(api.deleteNotification).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(6_000);
      expect(api.deleteNotification).toHaveBeenCalledWith('read-1');
    });

    it('deletes at once, with no slide, under prefers-reduced-motion', async () => {
      stubReducedMotion(true);
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(api.listNotifications).mockResolvedValue({
        items: [
          notif({ id: 'read-1', title: 'Cita anterior', readAt: READ_AT }),
        ],
        nextCursor: null,
      });
      const user = userEvent.setup();
      renderCenter();

      await user.click(
        await screen.findByRole('button', {
          name: 'Eliminar notificación: Cita anterior',
        }),
      );

      // Gone immediately — no exit animation, no transitionend needed.
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /Cita anterior\./ }),
        ).not.toBeInTheDocument(),
      );

      await vi.advanceTimersByTimeAsync(6_000);
      expect(api.deleteNotification).toHaveBeenCalledWith('read-1');
    });

    it('"Eliminar leídas" confirms, then removes only the read rows', async () => {
      vi.mocked(api.listNotifications).mockResolvedValue({
        items: [
          notif({ id: 'u1', readAt: null }),
          notif({ id: 'r1', title: 'Leída una', readAt: READ_AT }),
          notif({ id: 'r2', title: 'Leída dos', readAt: READ_AT }),
        ],
        nextCursor: null,
      });
      const user = userEvent.setup();
      renderCenter();

      await screen.findByRole('button', { name: /Leída una\./ });
      await user.click(screen.getByRole('button', { name: 'Eliminar leídas' }));

      const dialog = screen.getByRole('dialog', {
        name: '¿Eliminar notificaciones leídas?',
      });
      await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

      await waitFor(() =>
        expect(api.deleteReadNotifications).toHaveBeenCalledTimes(1),
      );
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /Leída una\./ }),
        ).not.toBeInTheDocument();
      });
      // The unread one stays.
      expect(
        screen.getByRole('button', { name: /^Sin leer\. Nueva cita\./ }),
      ).toBeInTheDocument();
      // Action hides once there is nothing read left.
      expect(
        screen.queryByRole('button', { name: 'Eliminar leídas' }),
      ).not.toBeInTheDocument();
    });

    it('fades every read row out together on "Eliminar leídas", unread untouched', async () => {
      let resolve!: (value: { deleted: number }) => void;
      vi.mocked(api.deleteReadNotifications).mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );
      vi.mocked(api.listNotifications).mockResolvedValue({
        items: [
          notif({ id: 'u1', readAt: null }),
          notif({ id: 'r1', title: 'Leída una', readAt: READ_AT }),
          notif({ id: 'r2', title: 'Leída dos', readAt: READ_AT }),
        ],
        nextCursor: null,
      });
      const user = userEvent.setup();
      renderCenter();

      await screen.findByRole('button', { name: /Leída una\./ });
      await user.click(screen.getByRole('button', { name: 'Eliminar leídas' }));
      await user.click(
        within(
          screen.getByRole('dialog', {
            name: '¿Eliminar notificaciones leídas?',
          }),
        ).getByRole('button', { name: 'Eliminar' }),
      );

      const rowFor = (name: RegExp) =>
        screen.getByRole('button', { name }).closest('.notif-row') as HTMLElement;

      // Both read rows animate out together; the unread row is left alone.
      expect(rowFor(/Leída una\./)).toHaveAttribute('data-exiting', 'true');
      expect(rowFor(/Leída dos\./)).toHaveAttribute('data-exiting', 'true');
      expect(rowFor(/^Sin leer\. Nueva cita\./)).not.toHaveAttribute(
        'data-exiting',
      );

      // Request settles → the read rows are pruned for real, unread survives.
      resolve({ deleted: 2 });
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /Leída una\./ }),
        ).not.toBeInTheDocument(),
      );
      expect(
        screen.getByRole('button', { name: /^Sin leer\. Nueva cita\./ }),
      ).toBeInTheDocument();
    });

    it('hides "Eliminar leídas" when every notification is unread', async () => {
      vi.mocked(api.listNotifications).mockResolvedValue({
        items: [notif({ id: 'u1', readAt: null })],
        nextCursor: null,
      });
      renderCenter();
      await screen.findByRole('button', { name: /Nueva cita\./ });
      expect(
        screen.queryByRole('button', { name: 'Eliminar leídas' }),
      ).not.toBeInTheDocument();
    });
  });
});
