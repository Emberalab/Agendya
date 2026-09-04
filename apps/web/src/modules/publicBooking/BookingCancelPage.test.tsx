import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { BookingCancelPage } from './BookingCancelPage';

vi.mock('./api');

const BASE_BOOKING = {
  id: 'booking-1',
  businessName: 'María Belleza',
  professionalSlug: 'maria-belleza',
  serviceId: 'service-1',
  serviceName: 'Corte de cabello',
  durationMinutes: 30,
  customerName: 'Ana',
  customerEmail: 'ana@example.com',
  customerPhone: '+57 300 1234567',
  atHome: false,
  customerAddress: null,
  startAt: '2026-08-03T14:00:00.000Z',
  endAt: '2026-08-03T14:30:00.000Z',
  status: 'CONFIRMED' as const,
  cancellationToken: 'token-abc',
  cancellationPolicyHours: 24,
  canCancel: true,
  canReschedule: true,
};

function renderPage(token = 'token-abc') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/bookings/${token}`]}>
        <Routes>
          <Route path="/bookings/:token" element={<BookingCancelPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookingCancelPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows a not-found message for an unknown token', async () => {
    vi.mocked(api.getBookingByToken).mockRejectedValue(new Error('Not found'));

    renderPage();

    expect(
      await screen.findByText('No encontramos esta reserva.'),
    ).toBeInTheDocument();
  });

  it('shows the cancel button when the booking can still be cancelled', async () => {
    vi.mocked(api.getBookingByToken).mockResolvedValue(BASE_BOOKING);

    renderPage();

    expect(await screen.findByText('Corte de cabello')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar reserva' }),
    ).toBeInTheDocument();
  });

  it('hides the cancel button and explains why when past the policy window', async () => {
    vi.mocked(api.getBookingByToken).mockResolvedValue({
      ...BASE_BOOKING,
      canCancel: false,
      canReschedule: false,
    });

    renderPage();

    await screen.findByText('Corte de cabello');
    expect(
      screen.queryByRole('button', { name: 'Cancelar reserva' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/al menos 24 horas de anticipación/),
    ).toBeInTheDocument();
  });

  it('shows a cancelled message for an already-cancelled booking', async () => {
    vi.mocked(api.getBookingByToken).mockResolvedValue({
      ...BASE_BOOKING,
      status: 'CANCELLED',
    });

    renderPage();

    expect(
      await screen.findByText('Esta reserva ya fue cancelada.'),
    ).toBeInTheDocument();
  });

  it('cancels the booking on click', async () => {
    vi.mocked(api.getBookingByToken).mockResolvedValue(BASE_BOOKING);
    vi.mocked(api.cancelBookingByToken).mockResolvedValue({
      ...BASE_BOOKING,
      status: 'CANCELLED',
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Corte de cabello');
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => {
      expect(api.cancelBookingByToken).toHaveBeenCalled();
    });
    expect(
      await screen.findByText('Esta reserva ya fue cancelada.'),
    ).toBeInTheDocument();
  });
});
