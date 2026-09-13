import { randomBytes } from 'node:crypto';
import type { BillingInterval, PaidPlan } from '@agendya/types';

const REFERENCE_RE =
  /^ag1_([0-9a-f]{32})_(BASIC|ADVANCED|BUSINESS)_(monthly|annual)_([a-f0-9]{12})$/;

export type BillingReference = {
  professionalId: string;
  plan: PaidPlan;
  interval: BillingInterval;
};

export function compactUuid(id: string): string {
  return id.replace(/-/g, '').toLowerCase();
}

export function expandUuid(compact: string): string {
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20, 32),
  ].join('-');
}

export function createBillingReference(
  professionalId: string,
  plan: PaidPlan,
  interval: BillingInterval,
): string {
  const nonce = randomBytes(6).toString('hex');
  return `ag1_${compactUuid(professionalId)}_${plan}_${interval}_${nonce}`;
}

export function parseBillingReference(
  reference: string,
): BillingReference | null {
  const match = REFERENCE_RE.exec(reference);
  if (!match) {
    return null;
  }
  return {
    professionalId: expandUuid(match[1]),
    plan: match[2] as PaidPlan,
    interval: match[3] as BillingInterval,
  };
}
