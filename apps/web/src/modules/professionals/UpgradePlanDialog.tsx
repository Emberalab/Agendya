import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BILLING_INTERVAL_LABELS,
  PLAN_LABELS,
  formatCop,
  planBillingOffers,
  planRank,
  type BillingInterval,
  type PaidPlan,
  type Plan,
} from '@agendya/types';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { createBillingCheckout, syncBillingTransaction } from './api';
import { PROFILE_QUERY_KEY } from './hooks/useProfile';
import { openWompiWidget } from './wompiWidget';
import { UpgradeSuccessDialog } from './UpgradeSuccessDialog';

interface UpgradePlanDialogProps {
  currentPlan: Plan;
  currentInterval?: BillingInterval | null;
  onClose: () => void;
}

export function UpgradePlanDialog({
  currentPlan,
  currentInterval = null,
  onClose,
}: UpgradePlanDialogProps) {
  const queryClient = useQueryClient();
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [selected, setSelected] = useState<PaidPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [upgradedPlan, setUpgradedPlan] = useState<Plan | null>(null);

  const offers = planBillingOffers().filter(
    (offer) => planRank(offer.plan) >= planRank(currentPlan),
  );

  async function pay() {
    if (!selected) {
      setError('Elige un plan.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const checkout = await createBillingCheckout({
        plan: selected,
        interval,
      });
      const result = await openWompiWidget(checkout);
      const transactionId = result.transaction?.id;
      const sync = transactionId
        ? await syncBillingTransaction({ transactionId })
        : await syncBillingTransaction({ reference: checkout.reference });
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      if (sync.applied) {
        setUpgradedPlan(selected);
        setShowSuccess(true);
        return;
      }
      setError(
        sync.status === 'APPROVED'
          ? 'El pago se recibió pero aún no se aplicó el plan. Recarga en un momento.'
          : 'El pago no fue aprobado. Puedes intentar de nuevo.',
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo abrir el pago.'));
    } finally {
      setBusy(false);
    }
  }

  if (showSuccess && upgradedPlan) {
    return (
      <UpgradeSuccessDialog
        plan={upgradedPlan}
        interval={interval}
        onClose={() => {
          setShowSuccess(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Mejorar plan"
        className="w-full max-w-[560px] rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '24px',
            color: 'var(--color-text-primary)',
          }}
        >
          Mejorar plan
        </h2>
        <p
          className="mt-1.5"
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
          }}
        >
          Pago de prueba (sandbox). No se cobra plata real. El plan se activa
          cuando Wompi confirma el pago.
        </p>

        <div className="flex gap-2 mt-5">
          {(['monthly', 'annual'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setInterval(option);
                if (selected === currentPlan && option === 'monthly') {
                  setSelected(null);
                }
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                border:
                  interval === option
                    ? '2px solid var(--color-brand-primary)'
                    : '1px solid var(--color-border)',
                background:
                  interval === option
                    ? 'var(--color-brand-surface)'
                    : 'transparent',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              {BILLING_INTERVAL_LABELS[option]}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-3 mt-5">
          {offers.map((offer) => {
            const price =
              interval === 'monthly' ? offer.monthlyCop : offer.annualCop;
            const sameTier = offer.plan === currentPlan;
            const isLocked =
              sameTier &&
              (currentInterval === interval ||
                (interval === 'monthly' &&
                  (currentInterval === 'annual' || currentInterval == null)));
            const isSelected = selected === offer.plan;
            return (
              <li key={offer.plan}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setSelected(offer.plan)}
                  className="w-full text-left rounded-2xl px-4 py-3"
                  style={{
                    border: isSelected
                      ? '2px solid var(--color-brand-primary)'
                      : '1px solid var(--color-border)',
                    background: isLocked
                      ? 'var(--color-brand-surface)'
                      : 'transparent',
                    cursor: isLocked ? 'default' : 'pointer',
                    opacity: isLocked ? 0.75 : 1,
                  }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '16px',
                      }}
                    >
                      {PLAN_LABELS[offer.plan]}
                      {isLocked
                        ? ' · tu plan'
                        : sameTier && interval === 'annual'
                          ? ' · pasar a anual'
                          : ''}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: 'var(--color-text-brand)',
                      }}
                    >
                      {formatCop(price)}
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {interval === 'monthly' ? ' / mes' : ' / año'}
                      </span>
                    </span>
                  </div>
                  {interval === 'annual' && (
                    <p
                      className="mt-1"
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Ahorras {formatCop(offer.customerSavesCop)} vs 12 meses
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {error && (
          <p
            className="mt-4"
            role="alert"
            style={{ fontSize: '13px', color: 'var(--color-danger)' }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 w-full mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-4 rounded-2xl text-sm font-semibold"
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={() => void pay()}
            disabled={busy || !selected}
            className="flex-1 py-4 rounded-2xl text-sm font-semibold"
            style={{
              backgroundColor: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              cursor: busy || !selected ? 'not-allowed' : 'pointer',
              opacity: busy || !selected ? 0.6 : 1,
            }}
          >
            {busy ? 'Abriendo Wompi…' : 'Pagar en Wompi'}
          </button>
        </div>
      </div>
    </div>
  );
}
