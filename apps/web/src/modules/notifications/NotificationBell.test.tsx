import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';

let unreadCount = 0;
vi.mock('./hooks/useUnreadCount', () => ({
  useUnreadCount: () => ({ data: unreadCount }),
}));

vi.mock('./NotificationCenter', () => ({
  NotificationCenter: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Notificaciones">
      <button type="button" onClick={onClose}>
        cerrar-stub
      </button>
    </div>
  ),
}));

afterEach(() => {
  unreadCount = 0;
});

describe('NotificationBell', () => {
  it('exposes an accessible name with the unread count', () => {
    unreadCount = 3;
    render(<NotificationBell />);
    expect(
      screen.getByRole('button', { name: 'Notificaciones, 3 sin leer' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('drops the count from the name and hides the badge when there is nothing unread', () => {
    unreadCount = 0;
    render(<NotificationBell />);
    const button = screen.getByRole('button', { name: 'Notificaciones' });
    expect(button).toBeInTheDocument();
    expect(button.textContent).not.toMatch(/\d/);
  });

  it('caps the badge at 99+', () => {
    unreadCount = 150;
    render(<NotificationBell />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('opens the notification centre on click and reports aria-expanded', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    const button = screen.getByRole('button', { name: 'Notificaciones' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');

    await user.click(button);

    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens with the keyboard', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toBeInTheDocument();
  });

  it('closes again', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: 'Notificaciones' }));
    await user.click(screen.getByText('cerrar-stub'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a labelled row in the "row" variant', () => {
    unreadCount = 2;
    render(<NotificationBell variant="row" />);
    const button = screen.getByRole('button', {
      name: 'Notificaciones, 2 sin leer',
    });
    expect(button).toHaveTextContent('Notificaciones');
  });
});
