import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { AgendaPage } from './AgendaPage';

vi.mock('./api');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AgendaPage />
    </QueryClientProvider>,
  );
}

// Far enough in the future that it clears the cancellation policy window,
// so the "Cancelar" button stays enabled.
const FUTURE_START = new Date(
  Date.now() + 30 * 24 * 60 * 60 * 1000,
).toISOString();
const FUTURE_END = new Date(
  Date.now() + 30 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
).toISOString();

const BOOKING = {
  id: 'booking-1',
  serviceId: '11111111-1111-1111-1111-111111111111',
  serviceName: 'Corte de cabello',
  durationMinutes: 30,
  customerName: 'Ana',
  customerEmail: 'ana@example.com',
  customerPhone: '+57 300 1234567',
  startAt: '2099-08-03T14:00:00.000Z',
  endAt: '2099-08-03T14:30:00.000Z',
  status: 'CONFIRMED' as const,
  cancellationPolicyHours: 24,
  createdAt: '2026-07-30T10:00:00.000Z',
  cancelledAt: null,
  cancelledBy: null,
};

describe('AgendaPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows a message when there are no bookings in range', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No hay citas en este período')).toBeInTheDocument();
  });

  it('lists bookings and allows cancelling a confirmed one from the actions menu', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);
    vi.mocked(api.cancelBooking).mockResolvedValue({ ...BOOKING, status: 'CANCELLED' });

    const user = userEvent.setup();
    renderPage();

    expect((await screen.findAllByText(/Corte de cabello/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ana/).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: 'Acciones' })[0]);
    const menuItem = await screen.findByRole('button', { name: 'Cancelar cita' });
    await user.click(menuItem);

    await waitFor(() => {
      expect(api.cancelBooking).toHaveBeenCalledWith('booking-1', expect.anything());
    });
  });

  it('opens the detail drawer from "Ver detalle"', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);

    const user = userEvent.setup();
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: 'Ver detalle' }))[0]);

    const drawer = await screen.findByText('Detalle de la cita');
    expect(within(drawer.closest('div')!).getByText('Detalle de la cita')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('shows the calendar, opens a day, and drills into a booking', async () => {
    const start = new Date();
    start.setHours(14, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60_000);
    const todayBooking = { ...BOOKING, startAt: start.toISOString(), endAt: end.toISOString() };
    vi.mocked(api.listAgenda).mockResolvedValue([todayBooking]);

    const user = userEvent.setup();
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: 'Calendario' }))[0]);

    // Day cell carries a "1 cita" count badge
    await user.click((await screen.findAllByText('1 cita'))[0]);

    // DaySidebar header
    expect(await screen.findByText('Agenda del día')).toBeInTheDocument();

    // Drill into the booking card -> detail drawer
    await user.click((await screen.findAllByText('Corte de cabello'))[0]);
    expect(await screen.findByText('Detalle de la cita')).toBeInTheDocument();
  });
});
