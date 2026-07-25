import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { SchedulePage } from './SchedulePage';

vi.mock('./api');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SchedulePage />
    </QueryClientProvider>,
  );
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.mocked(api.getWorkingHours).mockResolvedValue([
      { id: 'wh-1', dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 },
    ]);
    vi.mocked(api.listExceptions).mockResolvedValue([
      { id: 'exc-1', date: '2026-12-25', reason: 'Navidad' },
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the configured working day and blocked dates', async () => {
    renderPage();

    const mondayLabel = await screen.findByText('Lunes');
    const mondayCheckbox = mondayLabel
      .closest('label')
      ?.querySelector('input[type="checkbox"]');
    expect(mondayCheckbox).toBeChecked();
    expect(await screen.findByText('2026-12-25')).toBeInTheDocument();
    expect(screen.getByText('Navidad')).toBeInTheDocument();
  });

  it('creates a new blocked date on submit', async () => {
    vi.mocked(api.createException).mockResolvedValue({
      id: 'exc-2',
      date: '2026-12-31',
      reason: null,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Lunes');

    const dateInput = document.getElementById(
      'exception-date',
    ) as HTMLInputElement;
    await user.type(dateInput, '2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Bloquear fecha' }));

    await waitFor(() => {
      expect(api.createException).toHaveBeenCalledWith(
        { date: '2026-12-31', reason: undefined },
        expect.anything(),
      );
    });
  });
});
