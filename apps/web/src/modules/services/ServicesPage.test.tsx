import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Service } from '@agendya/types';
import * as api from './api';
import * as profileApi from '../professionals/api';
import { ServicesPage } from './ServicesPage';

vi.mock('./api');
vi.mock('../professionals/api');

const BASE_SERVICE: Service = {
  id: 'service-1',
  name: 'Corte de cabello',
  description: 'Corte clásico o moderno.',
  durationMinutes: 40,
  priceCents: 2000000,
  isActive: true,
  homeServiceEnabled: false,
  homeDurationMinutes: null,
  homePriceCents: null,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeService(overrides: Partial<Service>): Service {
  return { ...BASE_SERVICE, ...overrides };
}

function setProfilePlan(plan: 'BASIC' | 'PRO') {
  vi.mocked(profileApi.getMyProfile).mockResolvedValue({
    id: 'prof-1',
    email: 'pro@example.com',
    businessName: 'Salón',
    slug: 'salon',
    photoUrl: null,
    logoUrl: null,
    coverImageUrl: null,
    brandColor: null,
    description: null,
    timezone: 'America/Bogota',
    cancellationPolicyHours: 24,
    plan,
    bookingsThisMonth: 0,
    monthlyBookingLimit: plan === 'PRO' ? null : 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard/services']}>
        <Routes>
          <Route path="/dashboard/services" element={<ServicesPage />} />
          <Route path="/dashboard/services/new" element={<div>NEW FORM</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ServicesPage', () => {
  beforeEach(() => {
    setProfilePlan('BASIC');
    vi.mocked(api.listServices).mockResolvedValue([BASE_SERVICE]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('lists existing services with their duration', async () => {
    renderPage();

    expect(await screen.findByText('Corte de cabello')).toBeInTheDocument();
    expect(screen.getByText('30 minutos')).toBeInTheDocument();
  });

  it('shows the empty state when there are no services', async () => {
    vi.mocked(api.listServices).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText('Aún no has creado ningún servicio'),
    ).toBeInTheDocument();
  });

  it('navigates to the create form when under the plan limit', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Corte de cabello');

    await user.click(
      screen.getAllByRole('button', { name: 'Crear servicio' })[0],
    );

    expect(await screen.findByText('NEW FORM')).toBeInTheDocument();
  });

  it('opens the plan-limit dialog instead of the form when at the limit', async () => {
    vi.mocked(api.listServices).mockResolvedValue([
      makeService({ id: 's1' }),
      makeService({ id: 's2' }),
      makeService({ id: 's3' }),
    ]);
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Corte de cabello');

    await user.click(
      screen.getAllByRole('button', { name: 'Crear servicio' })[0],
    );

    expect(
      await screen.findByText('Límite de servicios alcanzado'),
    ).toBeInTheDocument();
    expect(screen.queryByText('NEW FORM')).not.toBeInTheDocument();
  });

  it('deletes a service after confirmation', async () => {
    vi.mocked(api.deleteService).mockResolvedValue(
      makeService({ isActive: false }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('Corte de cabello');

    await user.click(
      screen.getByRole('button', {
        name: 'Más acciones para Corte de cabello',
      }),
    );
    await user.click(await screen.findByText('Eliminar servicio'));

    const dialog = await screen.findByRole('dialog', {
      name: 'Eliminar servicio',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(api.deleteService).toHaveBeenCalledWith(
        'service-1',
        expect.anything(),
      );
    });
  });
});
