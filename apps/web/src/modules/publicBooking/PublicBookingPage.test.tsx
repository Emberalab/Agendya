import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { PublicBookingPage } from './PublicBookingPage';

vi.mock('./api');

function renderPage(slug = 'maria-belleza') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/${slug}`]}>
        <Routes>
          <Route path="/:slug" element={<PublicBookingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublicBookingPage', () => {
  beforeEach(() => {
    vi.mocked(api.getPublicProfessional).mockResolvedValue({
      businessName: 'María Belleza',
      slug: 'maria-belleza',
      photoUrl: null,
      description: 'Especialista en color',
      services: [
        { id: 'service-1', name: 'Corte de cabello', durationMinutes: 30 },
        { id: 'service-2', name: 'Manicure', durationMinutes: 45 },
      ],
    });
    vi.mocked(api.getAvailability).mockResolvedValue([
      '2026-08-03T14:00:00.000Z',
      '2026-08-03T14:15:00.000Z',
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows a not-found message for an unknown slug', async () => {
    vi.mocked(api.getPublicProfessional).mockRejectedValue(
      new Error('Not found'),
    );

    renderPage('no-existe');

    expect(
      await screen.findByText('No encontramos esta página.'),
    ).toBeInTheDocument();
  });

  it('renders the professional and lets the customer pick a service, date, and slot', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'María Belleza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Corte de cabello')).toBeInTheDocument();
    expect(screen.getByText('Manicure')).toBeInTheDocument();

    await user.click(screen.getByText('Corte de cabello'));

    const dateInput = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();

    await user.type(dateInput, '2026-08-03');

    await waitFor(() => {
      expect(api.getAvailability).toHaveBeenCalledWith(
        'maria-belleza',
        ['service-1'],
        '2026-08-03',
      );
    });

    expect(screen.queryByText('3. Tus datos')).not.toBeInTheDocument();
  });

  it('creates a booking end to end and shows the confirmation screen', async () => {
    vi.mocked(api.createPublicBooking).mockResolvedValue({
      id: 'booking-1',
      businessName: 'María Belleza',
      professionalSlug: 'maria-belleza',
      serviceId: 'service-1',
      serviceName: 'Corte de cabello',
      durationMinutes: 30,
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      startAt: '2026-08-03T14:00:00.000Z',
      endAt: '2026-08-03T14:30:00.000Z',
      status: 'CONFIRMED',
      cancellationToken: 'token-abc',
      cancellationPolicyHours: 24,
      canCancel: true,
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'María Belleza' });
    await user.click(screen.getByText('Corte de cabello'));

    const dateInput = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    await user.type(dateInput, '2026-08-03');

    const slotButtons = await screen.findAllByRole('button', {
      name: /^\d{1,2}:\d{2}/,
    });
    await user.click(slotButtons[0]);

    await screen.findByText('3. Tus datos');
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Correo'), 'ana@example.com');
    await user.type(screen.getByLabelText('Teléfono'), '+57 300 1234567');
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }));

    expect(await screen.findByText('¡Reserva confirmada!')).toBeInTheDocument();
    expect(api.createPublicBooking).toHaveBeenCalledWith(
      'maria-belleza',
      expect.objectContaining({
        serviceIds: 'service-1',
        startAt: '2026-08-03T14:00:00.000Z',
      }),
    );
  });
});
