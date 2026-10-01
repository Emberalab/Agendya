import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationEntry } from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';
import { RegistrationsManager } from './RegistrationsManager';

vi.mock('../../shared/api/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const base = {
  businessName: 'Negocio',
  slug: 'negocio',
  accessStatus: 'APPROVED' as const,
  role: 'INDEPENDENT' as const,
  plan: 'FREE' as const,
  createdAt: '2026-09-14T15:00:00.000Z',
};

const ENTRIES: RegistrationEntry[] = [
  {
    ...base,
    id: '11111111-1111-4111-8111-111111111111',
    email: 'gaitan9103@gmail.com',
    trial: {
      startedAt: '2026-09-30T18:55:29.390Z',
      endsAt: '2026-10-30T18:55:29.390Z',
      active: true,
    },
  },
  {
    ...base,
    id: '22222222-2222-4222-8222-222222222222',
    email: 'ended@example.com',
    trial: {
      startedAt: '2026-08-01T15:00:00.000Z',
      endsAt: '2026-08-31T15:00:00.000Z',
      active: false,
    },
  },
  {
    ...base,
    id: '33333333-3333-4333-8333-333333333333',
    email: 'info@agendya.co',
    trial: null,
  },
];

describe('RegistrationsManager', () => {
  afterEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('shows a Prueba column with each account’s trial state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: ENTRIES });
    render(<RegistrationsManager />);

    expect(
      await screen.findByRole('columnheader', { name: 'Prueba' }),
    ).toBeInTheDocument();

    const row = (email: string) =>
      screen.getByRole('cell', { name: email }).closest('tr')!;
    expect(
      within(row('gaitan9103@gmail.com')).getByText(/Activa · hasta 30 de oct/),
    ).toBeInTheDocument();
    expect(
      within(row('ended@example.com')).getByText(/Terminó el 31 de ago/),
    ).toBeInTheDocument();
    expect(within(row('info@agendya.co')).getByText('—')).toBeInTheDocument();
  });
});
