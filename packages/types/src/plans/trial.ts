import { z } from 'zod';
import { PLANS, planRank, type Plan } from './catalog';

/**
 * Full-access trial — single source of truth for its business rules.
 *
 * A trial is granted per commercial account (the `Professional` row) by a
 * Super Admin. It does not touch `Professional.plan` (the billed plan): while
 * the trial window is open, `effectivePlan()` resolves to `TRIAL_PLAN`, and
 * once it closes the billed plan (FREE by default) applies again. Nothing has
 * to be written for a trial to end — the window is derived from the stored
 * instants, so an account that never logs in is still FREE the moment it ends.
 */

/** Length of a newly granted trial. Change here to change every new trial. */
export const TRIAL_DURATION_DAYS = 30;

/** Upper bound for a single admin "extend" action. */
export const TRIAL_MAX_EXTENSION_DAYS = 30;

/** The plan a trial behaves as: the top tier, i.e. full access. */
export const TRIAL_PLAN: Plan = PLANS[PLANS.length - 1];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Stored trial window on the account. Both null = never had a trial. */
export type TrialWindow = {
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

/**
 * End of a trial started at `from`. Measured as exact 24-hour days from the
 * activation instant (UTC), like paid periods: DST-proof and independent of
 * the professional's or the browser's time zone.
 */
export function trialEndsAtFrom(
  from: Date,
  days: number = TRIAL_DURATION_DAYS,
): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/** Half-open window: active while `trialStartedAt <= now < trialEndsAt`. */
export function isTrialActive(
  trial: TrialWindow,
  now: Date = new Date(),
): boolean {
  if (!trial.trialStartedAt || !trial.trialEndsAt) {
    return false;
  }
  const t = now.getTime();
  return trial.trialStartedAt.getTime() <= t && t < trial.trialEndsAt.getTime();
}

/** A trial was granted at some point (active or not). */
export function hasUsedTrial(trial: TrialWindow): boolean {
  return trial.trialStartedAt !== null;
}

/**
 * The plan whose limits and features apply right now.
 *
 * - Trial active → the better of `TRIAL_PLAN` and the billed plan.
 * - Otherwise → the billed plan (`Professional.plan`), whose own paid
 *   lifecycle (grace, expiry job) is unchanged.
 *
 * Every limit check in the API must go through this — never read
 * `professional.plan` directly for entitlements.
 */
export function effectivePlan(
  account: { plan: Plan } & TrialWindow,
  now: Date = new Date(),
): Plan {
  if (
    isTrialActive(account, now) &&
    planRank(TRIAL_PLAN) > planRank(account.plan)
  ) {
    return TRIAL_PLAN;
  }
  return account.plan;
}

/**
 * Whole days left, rounded up (any part of a day counts as one), 0 once
 * ended. Display-only; entitlement never depends on it.
 */
export function trialDaysRemaining(
  trialEndsAt: Date,
  now: Date = new Date(),
): number {
  const ms = trialEndsAt.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/** Trial state as the API reports it. `active` is computed server-side. */
export const trialInfoSchema = z.object({
  startedAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  active: z.boolean(),
});

export type TrialInfo = z.infer<typeof trialInfoSchema>;

export function toTrialInfo(
  trial: TrialWindow,
  now: Date = new Date(),
): TrialInfo | null {
  if (!trial.trialStartedAt || !trial.trialEndsAt) {
    return null;
  }
  return {
    startedAt: trial.trialStartedAt.toISOString(),
    endsAt: trial.trialEndsAt.toISOString(),
    active: isTrialActive(trial, now),
  };
}
