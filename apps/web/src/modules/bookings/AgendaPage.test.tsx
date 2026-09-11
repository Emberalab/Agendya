import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { AgendaPage } from './AgendaPage';
import { useAgendaViewStore } from './agendaViewStore';

vi.mock('./api');

function renderPage(path = '/dashboard/agenda') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AgendaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// The 2099 start/end below are far enough in the future to clear the
// cancellation policy window, so the "Cancelar" button stays enabled.
const BOOKING = {
  id: 'booking-1',
  serviceId: '11111111-1111-1111-1111-111111111111',
  serviceName: 'Corte de cabello',
  durationMinutes: 30,
  customerName: 'Ana',
  customerEmail: 'ana@example.com',
  customerPhone: '+57 300 1234567',
  customerNote: null,
  atHome: false,
  customerAddress: null,
  startAt: '2099-08-03T14:00:00.000Z',
  endAt: '2099-08-03T14:30:00.000Z',
  status: 'CONFIRMED' as const,
  cancellationPolicyHours: 24,
  canReschedule: true,
  createdAt: '2026-07-30T10:00:00.000Z',
  cancelledAt: null,
  cancelledBy: null,
};

// A home-service booking whose address is the long, accent-bearing, comma-and-
// "(Ref.: …)" string the public wizard's `composeAddress` produces.
const HOME_BOOKING = {
  ...BOOKING,
  atHome: true,
  customerAddress:
    'Calle 10 #43C-20, Apartamento 502 Torre 1, Barrio El Poblado (Ref.: portón negro junto a la panadería, timbre 502)',
};

describe('AgendaPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
    // agendaViewStore is a module-scoped singleton (that's the point — it
    // survives AgendaPage unmounting), so it leaks across tests in this file
    // unless reset. Every test should start from the product default.
    useAgendaViewStore.setState({ viewMode: 'list' });
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

    expect(
      await screen.findByRole('heading', { name: 'Detalle de la cita' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('shows the customer note in the detail drawer when the booking has one', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([
      { ...BOOKING, customerNote: 'Vengo con mi hijo, corte para los dos' },
    ]);

    const user = userEvent.setup();
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: 'Ver detalle' }))[0]);

    expect(
      await screen.findByText('Vengo con mi hijo, corte para los dos'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sin observaciones')).not.toBeInTheDocument();
  });

  it('wraps a very long observation instead of letting it overflow', async () => {
    const wall = 'a'.repeat(400);
    vi.mocked(api.listAgenda).mockResolvedValue([
      {
        ...BOOKING,
        customerNote: `${wall} https://ejemplo.com/${'x'.repeat(120)}`,
      },
    ]);

    const user = userEvent.setup();
    renderPage();
    await user.click(
      (await screen.findAllByRole('button', { name: 'Ver detalle' }))[0],
    );

    const note = await screen.findByText(new RegExp(wall));
    // The wrap utility is what keeps it inside the card (jsdom has no layout,
    // so we assert the mechanism rather than pixels — the e2e checks overflow).
    expect(note).toHaveClass('agendya-longtext');
  });

  it('shows the home-service address only for an "a domicilio" booking', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([HOME_BOOKING]);

    const user = userEvent.setup();
    renderPage();
    await user.click(
      (await screen.findAllByRole('button', { name: 'Ver detalle' }))[0],
    );

    expect(await screen.findByText('DOMICILIO')).toBeInTheDocument();
    expect(screen.getByText('Servicio a domicilio')).toBeInTheDocument();
    const address = screen.getByText(/Calle 10 #43C-20, Apartamento 502/);
    expect(address).toBeInTheDocument();
    expect(address).toHaveClass('agendya-longtext');
  });

  it('does not show any address block for a non-home booking', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);

    const user = userEvent.setup();
    renderPage();
    await user.click(
      (await screen.findAllByRole('button', { name: 'Ver detalle' }))[0],
    );

    await screen.findByText('Detalle de la cita');
    expect(screen.queryByText('DOMICILIO')).not.toBeInTheDocument();
    expect(screen.queryByText('Servicio a domicilio')).not.toBeInTheDocument();
  });

  it('names the address plainly when an at-home booking has none stored', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([
      { ...HOME_BOOKING, customerAddress: null },
    ]);

    const user = userEvent.setup();
    renderPage();
    await user.click(
      (await screen.findAllByRole('button', { name: 'Ver detalle' }))[0],
    );

    expect(await screen.findByText('DOMICILIO')).toBeInTheDocument();
    expect(
      screen.getByText('El cliente no registró una dirección.'),
    ).toBeInTheDocument();
  });

  it('opens the detail drawer for the booking named in a notification deep link', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);

    renderPage('/dashboard/agenda?booking=booking-1&date=2099-08-03');

    expect(await screen.findByText('Detalle de la cita')).toBeInTheDocument();
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

  describe('view selection persistence', () => {
    async function activeViewButton(name: 'Lista' | 'Calendario') {
      return (await screen.findAllByRole('button', { name }))[0];
    }

    it('defaults to Lista on first visit', async () => {
      vi.mocked(api.listAgenda).mockResolvedValue([]);

      renderPage();

      expect(await activeViewButton('Lista')).toHaveStyle({
        backgroundColor: 'var(--color-brand-primary)',
      });
      // The filter bar (search/date-range/status) only renders in list view.
      expect(await screen.findByText(/Mostrando/)).toBeInTheDocument();
    });

    it('keeps Calendario selected after navigating away and back to Agenda', async () => {
      vi.mocked(api.listAgenda).mockResolvedValue([]);

      const user = userEvent.setup();
      const { unmount } = renderPage();

      await user.click(await activeViewButton('Calendario'));
      expect(await activeViewButton('Calendario')).toHaveStyle({
        backgroundColor: 'var(--color-brand-primary)',
      });

      // Simulates the route unmounting AgendaPage (e.g. Agenda -> Servicios
      // -> Perfil) and mounting it again on return, the same as
      // react-router does for a real navigation between sibling routes.
      unmount();
      renderPage();

      expect(await activeViewButton('Calendario')).toHaveStyle({
        backgroundColor: 'var(--color-brand-primary)',
      });
      expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
    });

    it('keeps Lista selected after switching back and navigating away and back', async () => {
      vi.mocked(api.listAgenda).mockResolvedValue([]);

      const user = userEvent.setup();
      const { unmount } = renderPage();

      await user.click(await activeViewButton('Calendario'));
      await user.click(await activeViewButton('Lista'));

      unmount();
      renderPage();

      expect(await activeViewButton('Lista')).toHaveStyle({
        backgroundColor: 'var(--color-brand-primary)',
      });
      expect(await screen.findByText(/Mostrando/)).toBeInTheDocument();
    });
  });
});
