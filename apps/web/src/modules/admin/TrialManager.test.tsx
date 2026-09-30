import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfessionalForPlanChange } from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';
import { TrialManager } from './TrialManager';

vi.mock('../../shared/api/apiClient', () => ({
  apiClient: { post: vi.fn() },
  isApiError: () => false,
}));

const BASE: ProfessionalForPlanChange = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'barber@example.com',
  businessName: 'Barbería',
  slug: 'barberia',
  plan: 'FREE',
  billingInterval: null,
  planExpiresAt: null,
  effectivePlan: 'FREE',
  trial: null,
  trialHistory: [],
};

const DAY = 24 * 60 * 60 * 1000;

describe('TrialManager', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(apiClient.post).mockReset();
  });

  it('grants a trial without sending any dates', async () => {
    const onUpdated = vi.fn();
    vi.mocked(apiClient.post).mockResolvedValue({ data: BASE });
    render(<TrialManager professional={BASE} onUpdated={onUpdated} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Activar prueba de 30 días' }),
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/professionals/barber%40example.com/trial',
      {},
    );
    expect(onUpdated).toHaveBeenCalledWith(BASE);
  });

  it('requires an explicit override to grant a used trial again', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: BASE });
    render(
      <TrialManager
        professional={{
          ...BASE,
          trial: {
            startedAt: new Date(Date.now() - 40 * DAY).toISOString(),
            endsAt: new Date(Date.now() - 10 * DAY).toISOString(),
            active: false,
          },
        }}
        onUpdated={vi.fn()}
      />,
    );

    const grant = screen.getByRole('button', {
      name: 'Activar prueba de 30 días',
    });
    expect(grant).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(grant);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/professionals/barber%40example.com/trial',
      { allowRepeat: true },
    );
  });

  it('offers extend and end for an active trial, and shows its history', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: BASE });
    render(
      <TrialManager
        professional={{
          ...BASE,
          effectivePlan: 'BUSINESS',
          trial: {
            startedAt: new Date(Date.now() - 18 * DAY).toISOString(),
            endsAt: new Date(Date.now() + 11.5 * DAY).toISOString(),
            active: true,
          },
          trialHistory: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              action: 'GRANTED',
              actorEmail: 'admin@agendya.co',
              previousEndsAt: null,
              endsAt: new Date(Date.now() + 11.5 * DAY).toISOString(),
              note: 'Piloto',
              createdAt: new Date(Date.now() - 18 * DAY).toISOString(),
            },
          ],
        }}
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText(/quedan 12 días/)).toBeInTheDocument();
    expect(screen.getByText(/Por admin@agendya.co/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Activar prueba/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Extender' }));
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/professionals/barber%40example.com/trial/extend',
      { days: 7 },
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Terminar prueba' }),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/professionals/barber%40example.com/trial/end',
      {},
    );
  });
});
