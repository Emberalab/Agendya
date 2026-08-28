import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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

const BOOKING = {
  id: 'booking-1',
  serviceId: 'service-1',
  serviceName: 'Corte de cabello',
  durationMinutes: 30,
  customerName: 'Ana',
  customerEmail: 'ana@example.com',
  customerPhone: '+57 300 1234567',
  startAt: '2026-08-03T14:00:00.000Z',
  endAt: '2026-08-03T14:30:00.000Z',
  status: 'CONFIRMED' as const,
  cancellationPolicyHours: 24,
};

describe('AgendaPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows a message when there are no bookings in range', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('No tienes citas en este rango de fechas.'),
    ).toBeInTheDocument();
  });

  it('lists bookings and allows cancelling a confirmed one', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);
    vi.mocked(api.cancelBooking).mockResolvedValue({
      ...BOOKING,
      status: 'CANCELLED',
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/Corte de cabello/)).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(api.cancelBooking).toHaveBeenCalledWith(
        'booking-1',
        expect.anything(),
      );
    });
  });
});
