import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpgradeSuccessDialog } from '../UpgradeSuccessDialog';
import * as api from '../api';
import { useBillingRedirect } from './useBillingRedirect';

vi.mock('../api');

function Harness() {
  const {
    notice,
    showSuccess,
    setShowSuccess,
    upgradedPlan,
    upgradedInterval,
  } = useBillingRedirect();
  return (
    <>
      {notice && <p>{notice}</p>}
      {showSuccess && upgradedPlan && upgradedInterval && (
        <UpgradeSuccessDialog
          plan={upgradedPlan}
          interval={upgradedInterval}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard/profile" element={<Harness />} />
          <Route path="/dashboard/agenda" element={<h1>Agenda</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('useBillingRedirect', () => {
  beforeEach(() => {
    vi.mocked(api.syncBillingTransaction).mockReset();
  });

  it('opens the success dialog from ?id= using sync.plan', async () => {
    vi.mocked(api.syncBillingTransaction).mockResolvedValue({
      applied: true,
      status: 'APPROVED',
      plan: 'ADVANCED',
      interval: 'annual',
    });

    renderAt('/dashboard/profile?id=tx-redirect');

    expect(await screen.findByRole('dialog', { name: 'Plan actualizado' }))
      .toBeInTheDocument();
    expect(screen.getByText(/Avanzado anual/)).toBeInTheDocument();
    expect(api.syncBillingTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-redirect',
    });

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Ir a la agenda' }),
    );
    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
  });

  it('keeps a pending notice when the payment is not applied', async () => {
    vi.mocked(api.syncBillingTransaction).mockResolvedValue({
      applied: false,
      status: 'DECLINED',
      plan: null,
      interval: null,
    });

    renderAt('/dashboard/profile?id=tx-fail');

    expect(
      await screen.findByText(/Estamos confirmando el pago/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Plan actualizado' }),
    ).not.toBeInTheDocument();
  });
});
