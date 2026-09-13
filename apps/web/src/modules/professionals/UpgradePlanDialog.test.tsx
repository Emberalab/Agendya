import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpgradePlanDialog } from './UpgradePlanDialog';
import * as api from './api';
import * as widget from './wompiWidget';

vi.mock('./api');
vi.mock('./wompiWidget');

function renderDialog(currentPlan: 'FREE' | 'BASIC' = 'FREE') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard/profile']}>
        <Routes>
          <Route
            path="/dashboard/profile"
            element={
              <UpgradePlanDialog currentPlan={currentPlan} onClose={vi.fn()} />
            }
          />
          <Route path="/dashboard/agenda" element={<h1>Agenda</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UpgradePlanDialog', () => {
  beforeEach(() => {
    vi.mocked(api.createBillingCheckout).mockResolvedValue({
      publicKey: 'pub_test_ci',
      currency: 'COP',
      amountInCents: 2_190_000,
      reference: 'ag1_ref',
      integrity: 'abc',
      redirectUrl: null,
      customerEmail: 'pro@example.com',
    });
    vi.mocked(api.syncBillingTransaction).mockResolvedValue({
      applied: true,
      status: 'APPROVED',
      plan: 'BASIC',
      interval: 'monthly',
    });
    vi.mocked(widget.openWompiWidget).mockResolvedValue({
      transaction: { id: 'tx-1', status: 'APPROVED' },
    });
  });

  it('opens Wompi after choosing a plan', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /Básico/ }));
    await user.click(screen.getByRole('button', { name: 'Pagar en Wompi' }));

    expect(api.createBillingCheckout).toHaveBeenCalledWith({
      plan: 'BASIC',
      interval: 'monthly',
    });
    expect(widget.openWompiWidget).toHaveBeenCalled();
    expect(api.syncBillingTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-1',
    });
  });

  it('shows success modal after payment is applied and goes to agenda', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /Básico/ }));
    await user.click(screen.getByRole('button', { name: 'Pagar en Wompi' }));

    expect(
      await screen.findByRole('dialog', { name: 'Plan actualizado' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ahora tienes el plan/)).toBeInTheDocument();
    expect(screen.getByText(/Básico mensual/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ir a la agenda' }));
    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
  });

  it('switches the listed price to annual', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Anual' }));
    expect(screen.getAllByText(/\/ año/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ahorras/).length).toBeGreaterThan(0);
    expect(screen.getByText(/254/)).toBeInTheDocument();
  });

  it('lets a BASIC subscriber pay the same plan annually', async () => {
    const user = userEvent.setup();
    renderDialog('BASIC');

    expect(
      screen.getByRole('button', { name: /Básico · tu plan/ }),
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Anual' }));
    const annualBasic = screen.getByRole('button', {
      name: /Básico · pasar a anual/,
    });
    expect(annualBasic).toBeEnabled();

    await user.click(annualBasic);
    await user.click(screen.getByRole('button', { name: 'Pagar en Wompi' }));

    expect(api.createBillingCheckout).toHaveBeenCalledWith({
      plan: 'BASIC',
      interval: 'annual',
    });
  });

  it('syncs by checkout reference when the widget returns no transaction', async () => {
    vi.mocked(widget.openWompiWidget).mockResolvedValue({});
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /Básico/ }));
    await user.click(screen.getByRole('button', { name: 'Pagar en Wompi' }));

    expect(api.syncBillingTransaction).toHaveBeenCalledWith({
      reference: 'ag1_ref',
    });
    expect(
      await screen.findByRole('dialog', { name: 'Plan actualizado' }),
    ).toBeInTheDocument();
  });
});
