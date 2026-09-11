import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../bookings/api';
import { AffectedBookingsPanel } from './AffectedBookingsPanel';

vi.mock('../bookings/api');

function renderPanel(onClose = () => {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AffectedBookingsPanel date="2026-09-17" onClose={onClose} />
    </QueryClientProvider>,
  );
}

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
  startAt: '2026-09-17T14:00:00.000Z',
  endAt: '2026-09-17T14:30:00.000Z',
  status: 'CONFIRMED' as const,
  cancellationPolicyHours: 24,
  canReschedule: true,
  createdAt: '2026-08-01T10:00:00.000Z',
  cancelledAt: null,
  cancelledBy: null,
};

describe('AffectedBookingsPanel', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('lists the bookings still on the blocked date', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);

    renderPanel();

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Corte de cabello')).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: /Citas del/ }),
    ).toBeInTheDocument();
  });

  it('says there are no bookings when the date is empty', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([]);

    renderPanel();

    expect(
      await screen.findByText('No hay citas en esta fecha.'),
    ).toBeInTheDocument();
  });

  it('cancels a booking from the panel, reusing the normal cancel endpoint', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);
    vi.mocked(api.cancelBooking).mockResolvedValue({
      ...BOOKING,
      status: 'CANCELLED',
    });

    const user = userEvent.setup();
    renderPanel();

    await screen.findByText('Ana');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(api.cancelBooking).toHaveBeenCalledWith(
        'booking-1',
        expect.anything(),
      );
    });
  });

  it('opens the reschedule dialog for a booking, reusing the normal reschedule flow', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([BOOKING]);

    const user = userEvent.setup();
    renderPanel();

    await screen.findByText('Ana');
    await user.click(screen.getByRole('button', { name: 'Reprogramar' }));

    expect(
      await screen.findByRole('dialog', { name: 'Modificar fecha y hora' }),
    ).toBeInTheDocument();
  });

  it('does not offer actions for a booking that is not actionable (already cancelled)', async () => {
    vi.mocked(api.listAgenda).mockResolvedValue([
      { ...BOOKING, status: 'CANCELLED' as const },
    ]);

    renderPanel();

    await screen.findByText('Ana');
    expect(
      screen.queryByRole('button', { name: 'Cancelar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reprogramar' }),
    ).not.toBeInTheDocument();
  });
});
