import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { ServicesPage } from './ServicesPage';

vi.mock('./api');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ServicesPage />
    </QueryClientProvider>,
  );
}

describe('ServicesPage', () => {
  beforeEach(() => {
    vi.mocked(api.listServices).mockResolvedValue([
      {
        id: 'service-1',
        name: 'Corte de cabello',
        durationMinutes: 30,
        isActive: true,
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('lists existing services', async () => {
    renderPage();

    expect(await screen.findByText('Corte de cabello')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('creates a new service on submit', async () => {
    vi.mocked(api.createService).mockResolvedValue({
      id: 'service-2',
      name: 'Manicure',
      durationMinutes: 45,
      isActive: true,
      sortOrder: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Corte de cabello');

    await user.type(
      screen.getByPlaceholderText('Nombre del servicio'),
      'Manicure',
    );
    await user.type(screen.getByPlaceholderText('Duración (min)'), '45');
    await user.click(screen.getByRole('button', { name: 'Agregar servicio' }));

    await waitFor(() => {
      expect(api.createService).toHaveBeenCalledWith(
        { name: 'Manicure', durationMinutes: 45 },
        expect.anything(),
      );
    });
  });
});
