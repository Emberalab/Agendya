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
    vi.stubGlobal('scrollTo', vi.fn());
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    vi.mocked(api.getPublicProfessional).mockResolvedValue({
      businessName: 'María Belleza',
      slug: 'maria-belleza',
      category: 'Peluquería',
      photoUrl: null,
      logoUrl: null,
      coverImageUrl: null,
      brandColor: '#4F46E5',
      description: 'Especialista en color',
      services: [
        {
          id: 'service-1',
          name: 'Corte de cabello',
          description: 'Corte clásico',
          durationMinutes: 30,
          priceCents: 3000000,
          homeServiceEnabled: true,
          homeDurationMinutes: 45,
          homePriceCents: 5000000,
        },
        {
          id: 'service-2',
          name: 'Manicure',
          description: null,
          durationMinutes: 45,
          priceCents: 2000000,
          homeServiceEnabled: false,
          homeDurationMinutes: null,
          homePriceCents: null,
        },
      ],
    });
    vi.mocked(api.getAvailability).mockResolvedValue([
      '2026-08-03T14:00:00.000Z',
      '2026-08-03T14:15:00.000Z',
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
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

  it('shows the landing hero and starts the wizard on "Reservar cita"', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'María Belleza' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reservar cita' }));

    expect(screen.getByText('Elige un servicio')).toBeInTheDocument();
    expect(screen.getByText('Corte de cabello')).toBeInTheDocument();
    expect(screen.getByText('Manicure')).toBeInTheDocument();
    // Continuar is gated until a service is picked.
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled();
  });

  it('walks through the wizard and creates an at-home booking', async () => {
    vi.mocked(api.createPublicBooking).mockResolvedValue({
      id: 'booking-1',
      businessName: 'María Belleza',
      professionalSlug: 'maria-belleza',
      serviceId: 'service-1',
      serviceName: 'Corte de cabello',
      durationMinutes: 45,
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      atHome: true,
      customerAddress: 'Calle 10 # 20-30',
      startAt: '2026-08-03T14:00:00.000Z',
      endAt: '2026-08-03T14:45:00.000Z',
      status: 'CONFIRMED',
      cancellationToken: 'token-abc',
      cancellationPolicyHours: 24,
      canCancel: true,
      canReschedule: true,
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'María Belleza' });
    await user.click(screen.getByRole('button', { name: 'Reservar cita' }));

    // Step 1 — service
    await user.click(screen.getByText('Corte de cabello'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    // Step 2 — modality
    expect(
      await screen.findByText('¿Dónde quieres recibir el servicio?'),
    ).toBeInTheDocument();
    await user.click(screen.getByText('A domicilio'));
    // At-home reveals the address sub-view.
    expect(
      await screen.findByText('¿Dónde será el servicio?'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Dirección/), 'Calle 10 # 20-30');
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    // Step 3 — date & time: pick a day from the calendar (next month, day 15,
    // which is always in the future and selectable).
    expect(await screen.findByText('Elige una fecha')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await user.click(screen.getByRole('button', { name: '15' }));

    await waitFor(() => {
      expect(api.getAvailability).toHaveBeenCalledWith(
        'maria-belleza',
        ['service-1'],
        expect.stringMatching(/^\d{4}-\d{2}-15$/),
        true,
      );
    });

    const slotButtons = await screen.findAllByRole('button', {
      name: /^\d{1,2}:\d{2}/,
    });
    await user.click(slotButtons[0]);
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    // Step 4 — details
    expect(await screen.findByText('Tus datos')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana');
    await user.type(
      screen.getByLabelText(/Correo electrónico/),
      'ana@example.com',
    );
    await user.type(screen.getByLabelText(/Celular/), '+57 300 1234567');
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    // Step 5 — confirm
    expect(await screen.findByText('Revisa tu cita')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }));

    expect(
      await screen.findByText('Tu cita está confirmada'),
    ).toBeInTheDocument();
    expect(api.createPublicBooking).toHaveBeenCalledWith(
      'maria-belleza',
      expect.objectContaining({
        serviceIds: 'service-1',
        startAt: '2026-08-03T14:00:00.000Z',
        atHome: true,
        customerAddress: 'Calle 10 # 20-30',
      }),
    );
  });

  it('prefills the contact fields from a previous booking saved on this device', async () => {
    window.localStorage.setItem(
      'agendya.publicBooking.customer.v1',
      JSON.stringify({
        name: 'Ana Previa',
        email: 'previa@example.com',
        phone: '+57 300 9999999',
        remember: true,
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'María Belleza' });
    await user.click(screen.getByRole('button', { name: 'Reservar cita' }));

    await user.click(screen.getByText('Corte de cabello'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    await user.click(screen.getByText('En el establecimiento'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await user.click(screen.getByRole('button', { name: '15' }));
    const slotButtons = await screen.findAllByRole('button', {
      name: /^\d{1,2}:\d{2}/,
    });
    await user.click(slotButtons[0]);
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(await screen.findByText('Tus datos')).toBeInTheDocument();
    expect(screen.getByLabelText(/Celular/)).toHaveValue('+57 300 9999999');
    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue('Ana Previa');
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue(
      'previa@example.com',
    );
  });

  it('jumps back to a step from the review screen via the edit pencil', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'María Belleza' });
    await user.click(screen.getByRole('button', { name: 'Reservar cita' }));

    await user.click(screen.getByText('Corte de cabello'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    await user.click(screen.getByText('En el establecimiento'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await user.click(screen.getByRole('button', { name: '15' }));
    const slotButtons = await screen.findAllByRole('button', {
      name: /^\d{1,2}:\d{2}/,
    });
    await user.click(slotButtons[0]);
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana');
    await user.type(
      screen.getByLabelText(/Correo electrónico/),
      'ana@example.com',
    );
    await user.type(screen.getByLabelText(/Celular/), '+57 300 1234567');
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(await screen.findByText('Revisa tu cita')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar hora' }));
    expect(screen.getByText('Elige una fecha')).toBeInTheDocument();
  });

  it('reopens the wizard prefilled from "Editar cita" and PATCHes the booking', async () => {
    const CONFIRMED = {
      id: 'booking-1',
      businessName: 'María Belleza',
      professionalSlug: 'maria-belleza',
      serviceId: 'service-1',
      serviceName: 'Corte de cabello',
      durationMinutes: 30,
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      customerNote: null,
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
    vi.mocked(api.createPublicBooking).mockResolvedValue(CONFIRMED);
    vi.mocked(api.updateBookingByToken).mockResolvedValue({
      ...CONFIRMED,
      customerName: 'Ana Editada',
    });

    const user = userEvent.setup();
    renderPage();

    // Book a slot end to end.
    await screen.findByRole('heading', { name: 'María Belleza' });
    await user.click(screen.getByRole('button', { name: 'Reservar cita' }));
    await user.click(screen.getByText('Corte de cabello'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await user.click(screen.getByText('En el establecimiento'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await user.click(screen.getByRole('button', { name: '15' }));
    const slotButtons = await screen.findAllByRole('button', {
      name: /^\d{1,2}:\d{2}/,
    });
    await user.click(slotButtons[0]);
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana');
    await user.type(
      screen.getByLabelText(/Correo electrónico/),
      'ana@example.com',
    );
    await user.type(screen.getByLabelText(/Celular/), '+57 300 1234567');
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }));

    // Confirmation → "Editar cita" reopens the wizard, prefilled.
    expect(
      await screen.findByText('Tu cita está confirmada'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar cita' }));

    expect(await screen.findByText('Elige un servicio')).toBeInTheDocument();
    // Service is preselected, so "Continuar" is enabled straight away.
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await user.click(screen.getByRole('button', { name: /Continuar/ })); // modality
    expect(await screen.findByText('Elige una fecha')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continuar/ })); // datetime (slot prefilled)

    expect(await screen.findByText('Tus datos')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue(
      'ana@example.com',
    );
    const nameField = screen.getByLabelText(/Nombre completo/);
    expect(nameField).toHaveValue('Ana');
    await user.clear(nameField);
    await user.type(nameField, 'Ana Editada');
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(await screen.findByText('Revisa tu cita')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(api.updateBookingByToken).toHaveBeenCalledWith(
        'token-abc',
        expect.objectContaining({
          serviceIds: 'service-1',
          customerName: 'Ana Editada',
        }),
      );
    });
    expect(api.createPublicBooking).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText('Tu cita está confirmada'),
    ).toBeInTheDocument();
  });

  // Regression: the backend rejects `customerAddress` over 200 characters
  // (packages/types `createBookingSchema`), but the composed address (line +
  // unit + neighborhood + "(Ref.: reference)") was never checked against that
  // limit client-side — a long "Referencia para el profesional" let the
  // customer click through every remaining step only to hit a generic
  // "Validation failed" on final submit, with no indication of what to fix.
  it('blocks continuing past the address step when the composed address is too long', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'María Belleza' });
    await user.click(screen.getByRole('button', { name: 'Reservar cita' }));

    await user.click(screen.getByText('Corte de cabello'));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    await user.click(screen.getByText('A domicilio'));
    expect(
      await screen.findByText('¿Dónde será el servicio?'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Dirección/), 'Calle 10 # 20-30');

    const continueButton = screen.getByRole('button', { name: /Continuar/ });
    expect(continueButton).toBeEnabled();

    // "Calle 10 # 20-30" (16) + " (Ref.: " (8) + 190 x 'a' + ")" (1) = 215
    // characters — well past the 200-char backend limit.
    await user.type(
      screen.getByLabelText('Referencia para el profesional'),
      'a'.repeat(190),
    );

    expect(
      await screen.findByText(/La dirección completa es muy larga/),
    ).toBeInTheDocument();
    expect(continueButton).toBeDisabled();

    // Trim it back under the limit and the step becomes completable again.
    const referenceField = screen.getByLabelText(
      'Referencia para el profesional',
    );
    await user.clear(referenceField);
    await user.type(referenceField, 'Portón negro');

    expect(
      screen.queryByText(/La dirección completa es muy larga/),
    ).not.toBeInTheDocument();
    expect(continueButton).toBeEnabled();
  });
});
