import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfessionalSearchResult } from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';
import { ProfessionalSearch } from './ProfessionalSearch';

vi.mock('../../shared/api/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

const RESULTS: ProfessionalSearchResult[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'gaitan9103@gmail.com',
    businessName: 'Jorge Gaitan',
    plan: 'FREE',
    trialActive: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'jorgeemherrera@gmail.com',
    businessName: 'Jorge Eliécer Muñoz Herrera',
    plan: 'BASIC',
    trialActive: false,
  },
];

describe('ProfessionalSearch', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: RESULTS });
  });
  afterEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('does not search until three characters are typed', async () => {
    const user = userEvent.setup();
    render(<ProfessionalSearch onSelect={vi.fn()} onSubmit={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'jo');
    expect(
      screen.getByText('Escribe al menos 3 caracteres para buscar.'),
    ).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 350));
    expect(apiClient.get).not.toHaveBeenCalled();

    await user.type(screen.getByRole('combobox'), 'r');
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith('/admin/professionals', {
        params: { q: 'jor' },
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('debounces typing into a single request for the final text', async () => {
    const user = userEvent.setup();
    render(<ProfessionalSearch onSelect={vi.fn()} onSubmit={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'jorge');
    await screen.findByText('gaitan9103@gmail.com');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0][1]?.params).toEqual({
      q: 'jorge',
    });
  });

  it('shows matches with plan and trial badge, and picks one on click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ProfessionalSearch onSelect={onSelect} onSubmit={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'jorge');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Prueba');
    expect(options[1]).not.toHaveTextContent('Prueba');

    await user.click(options[1]);
    expect(onSelect).toHaveBeenCalledWith('jorgeemherrera@gmail.com');
    expect(screen.getByRole('combobox')).toHaveValue(
      'jorgeemherrera@gmail.com',
    );
  });

  it('supports keyboard selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ProfessionalSearch onSelect={onSelect} onSubmit={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'jorge');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('jorgeemherrera@gmail.com');
  });

  it('falls back to an exact lookup when nothing is highlighted', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ProfessionalSearch onSelect={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByRole('combobox'), 'x@y.co{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('x@y.co');
  });

  it('says so when nothing matches', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    render(<ProfessionalSearch onSelect={vi.fn()} onSubmit={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(
      await screen.findByText('Ninguna cuenta coincide con “zzz”.'),
    ).toBeInTheDocument();
  });
});
