import { PAID_PLANS, PLAN_LABELS, type PaidPlan, type Plan } from './catalog';

export const BILLING_INTERVALS = ['monthly', 'annual'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: 'Mensual',
  annual: 'Anual',
};

/**
 * Wompi Plan Avanzado (agregador), Colombia 2026.
 * Comisión = 2,65% + $700 COP, más IVA 19% **sobre la comisión**.
 * Confirmar en el dashboard del comercio si el plan cambia a Gateway.
 */
export const WOMPI_PERCENT_BPS = 265;
export const WOMPI_FIXED_COP = 700;
export const WOMPI_IVA_BPS = 1900;

/** Days a paid plan stays active after a failed charge. Then → FREE. */
export const BILLING_GRACE_DAYS = 3;

/**
 * Methods we enable on the Wompi widget / payment source.
 * PSE and Daviplata can be added if the merchant account has them.
 */
export const WOMPI_PAYMENT_METHODS = [
  'CARD',
  'NEQUI',
  'BANCOLOMBIA_TRANSFER',
] as const;
export type WompiPaymentMethod = (typeof WOMPI_PAYMENT_METHODS)[number];

export const WOMPI_PAYMENT_METHOD_LABELS: Record<WompiPaymentMethod, string> =
  {
    CARD: 'Tarjeta',
    NEQUI: 'Nequi',
    BANCOLOMBIA_TRANSFER: 'Bancolombia',
  };

const COP_CENTS = 100;

/** Display prices in whole COP. FREE is 0. */
export const PLAN_PRICE_COP: Record<
  Plan,
  Record<BillingInterval, number>
> = {
  FREE: { monthly: 0, annual: 0 },
  // Mockup Básico was $19.900. Grossed up so net after Wompi stays ≥ that.
  BASIC: { monthly: 21_900, annual: 254_900 },
  ADVANCED: { monthly: 44_900, annual: 529_900 },
  BUSINESS: { monthly: 89_900, annual: 1_069_900 },
};

export type WompiFeeBreakdown = {
  amountCop: number;
  percentCop: number;
  fixedCop: number;
  ivaCop: number;
  wompiCop: number;
  netCop: number;
};

/** Exact COP cents → pesos with 2 decimals (Wompi uses amount_in_cents). */
export function copToCents(cop: number): number {
  return Math.round(cop * COP_CENTS);
}

export function centsToCop(cents: number): number {
  return cents / COP_CENTS;
}

export function wompiFeeBreakdown(amountCop: number): WompiFeeBreakdown {
  if (amountCop <= 0) {
    return {
      amountCop: 0,
      percentCop: 0,
      fixedCop: 0,
      ivaCop: 0,
      wompiCop: 0,
      netCop: 0,
    };
  }

  const amountCents = copToCents(amountCop);
  const percentCents = Math.round(
    (amountCents * WOMPI_PERCENT_BPS) / 10_000,
  );
  const fixedCents = copToCents(WOMPI_FIXED_COP);
  const baseCents = percentCents + fixedCents;
  const ivaCents = Math.round((baseCents * WOMPI_IVA_BPS) / 10_000);
  const wompiCents = baseCents + ivaCents;

  return {
    amountCop: centsToCop(amountCents),
    percentCop: centsToCop(percentCents),
    fixedCop: centsToCop(fixedCents),
    ivaCop: centsToCop(ivaCents),
    wompiCop: centsToCop(wompiCents),
    netCop: centsToCop(amountCents - wompiCents),
  };
}

export type PlanBillingOffer = {
  plan: PaidPlan;
  label: string;
  monthlyCop: number;
  annualCop: number;
  twelveMonthsCop: number;
  /** What the professional saves by paying the year in one charge. */
  customerSavesCop: number;
  monthlyFee: WompiFeeBreakdown;
  annualFee: WompiFeeBreakdown;
  /** Net if they pay 12 separate monthly charges. */
  twelveMonthlyNetCop: number;
};

export function planBillingOffers(): PlanBillingOffer[] {
  return PAID_PLANS.map((plan) => {
    const monthlyCop = PLAN_PRICE_COP[plan].monthly;
    const annualCop = PLAN_PRICE_COP[plan].annual;
    const twelveMonthsCop = monthlyCop * 12;
    const monthlyFee = wompiFeeBreakdown(monthlyCop);
    const annualFee = wompiFeeBreakdown(annualCop);
    return {
      plan,
      label: PLAN_LABELS[plan],
      monthlyCop,
      annualCop,
      twelveMonthsCop,
      customerSavesCop: twelveMonthsCop - annualCop,
      monthlyFee,
      annualFee,
      twelveMonthlyNetCop: monthlyFee.netCop * 12,
    };
  });
}

export function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** "Básico mensual", "Avanzado anual". FREE / no cycle → just the plan name. */
export function formatPlanWithInterval(
  plan: Plan,
  interval: BillingInterval | null | undefined,
): string {
  const name = PLAN_LABELS[plan];
  if (plan === 'FREE' || !interval) {
    return name;
  }
  return `${name} ${BILLING_INTERVAL_LABELS[interval].toLowerCase()}`;
}

/**
 * End of the paid window in UTC. Month-end dates clamp (31 Jan → 28/29 Feb).
 * Recurring charge is not wired yet; this is the date we will check later.
 */
export function planPeriodEnd(from: Date, interval: BillingInterval): Date {
  return addUtcMonths(from, interval === 'monthly' ? 1 : 12);
}

/** Inverse of `planPeriodEnd` for rows that have expiry but no stored start. */
export function planPeriodStart(
  expiresAt: Date,
  interval: BillingInterval,
): Date {
  return addUtcMonths(expiresAt, interval === 'monthly' ? -1 : -12);
}

function addUtcMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const day = from.getUTCDate();
  const lastDayOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(day, lastDayOfTarget),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}
