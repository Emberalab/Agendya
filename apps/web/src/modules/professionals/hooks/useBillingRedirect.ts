import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { BillingInterval, Plan } from '@agendya/types';
import { syncBillingTransaction } from '../api';
import { PROFILE_QUERY_KEY } from './useProfile';

export function useBillingRedirect() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [upgradedPlan, setUpgradedPlan] = useState<Plan | null>(null);
  const [upgradedInterval, setUpgradedInterval] =
    useState<BillingInterval | null>(null);

  useEffect(() => {
    if (searchParams.get('upgrade') !== '1') {
      return;
    }
    setUpgradeOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('upgrade');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const transactionId = searchParams.get('id');
    if (!transactionId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const sync = await syncBillingTransaction({ transactionId });
        if (cancelled) {
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: PROFILE_QUERY_KEY,
        });
        if (sync.applied && sync.plan && sync.interval) {
          setUpgradedPlan(sync.plan);
          setUpgradedInterval(sync.interval);
          setShowSuccess(true);
        } else if (sync.applied) {
          setNotice('Tu plan ya está activo.');
        } else {
          setNotice(
            'Estamos confirmando el pago. Recarga en un momento si no ves el cambio.',
          );
        }
      } catch {
        if (!cancelled) {
          setNotice('No pudimos confirmar el pago todavía.');
        }
      } finally {
        const next = new URLSearchParams(searchParams);
        next.delete('id');
        setSearchParams(next, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient, searchParams, setSearchParams]);

  return {
    notice,
    upgradeOpen,
    setUpgradeOpen,
    showSuccess,
    setShowSuccess,
    upgradedPlan,
    upgradedInterval,
  };
}
