import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
      <MemoryRouter initialEntries={['/dashboard/schedule']}>
        <Routes>
          <Route path="/dashboard/schedule" element={<SchedulePage />} />
          <Route
            path="/dashboard/schedule/:day"
            element={<div>DAY CONFIG</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.mocked(api.getWorkingHours).mockResolvedValue([
      { id: 'wh-1', dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 780 },
      { id: 'wh-2', dayOfWeek: 'MONDAY', startMinute: 900, endMinute: 1080 },
    ]);
    vi.mocked(api.listExceptions).mockResolvedValue([
      { id: 'exc-1', date: '2026-12-25', reason: 'Navidad' },
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // The page renders both a desktop table and a mobile card stack (Tailwind
  // `hidden`/`lg:hidden` keeps both in the DOM under jsdom), so day-level
  // controls appear twice — assertions target the first match.

  it('renders each working block for the configured day and the blocked dates', async () => {
    renderPage();

    const [mondayToggle] = await screen.findAllByRole('switch', {
      name: 'Estado de Lunes',
    });
    expect(mondayToggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByText('09:00 – 13:00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15:00 – 18:00').length).toBeGreaterThan(0);

    const [sundayToggle] = screen.getAllByRole('switch', {
      name: 'Estado de Domingo',
    });
    expect(sundayToggle).toHaveAttribute('aria-checked', 'false');

    expect(
      await screen.findByText('25 de diciembre de 2026'),
    ).toBeInTheDocument();
    expect(screen.getByText('Navidad')).toBeInTheDocument();
  });

  it('navigates to the per-day editor from the row action', async () => {
    const user = userEvent.setup();
    renderPage();

    const [configureMonday] = await screen.findAllByRole('button', {
      name: 'Configurar Lunes',
    });
    await user.click(configureMonday);

    expect(await screen.findByText('DAY CONFIG')).toBeInTheDocument();
  });

  it('creates a new blocked date on submit', async () => {
    vi.mocked(api.createException).mockResolvedValue({
      id: 'exc-2',
      date: '2026-12-31',
      reason: null,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('switch', { name: 'Estado de Lunes' });

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

  it('tells the professional their existing appointments were kept when blocking a date that already has some', async () => {
    // Business rule: blocking a date never cancels bookings that already
    // exist on it — only the UI copy communicates that, so this guards
    // against the message silently disappearing or, worse, implying
    // cancellation.
    vi.mocked(api.createException).mockResolvedValue({
      id: 'exc-2',
      date: '2026-12-31',
      reason: null,
      affectedBookingsCount: 3,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('switch', { name: 'Estado de Lunes' });

    const dateInput = document.getElementById(
      'exception-date',
    ) as HTMLInputElement;
    await user.type(dateInput, '2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Bloquear fecha' }));

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('3');
    expect(notice).toHaveTextContent('no las cancela');
  });

  it('shows no appointments-kept notice when the blocked date had no bookings', async () => {
    vi.mocked(api.createException).mockResolvedValue({
      id: 'exc-2',
      date: '2026-12-31',
      reason: null,
      affectedBookingsCount: 0,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole('switch', { name: 'Estado de Lunes' });

    const dateInput = document.getElementById(
      'exception-date',
    ) as HTMLInputElement;
    await user.type(dateInput, '2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Bloquear fecha' }));

    await waitFor(() => {
      expect(api.createException).toHaveBeenCalled();
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
