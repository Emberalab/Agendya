import {
  ACTIVITY_FALLBACK_WINDOW_DAYS,
  isTrialActive,
  trialDaysRemaining,
  type ActivityListQuery,
  type TrialStatus,
  type TrialWindow,
} from '@agendya/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SummaryWindow {
  basis: 'TRIAL' | 'RECENT';
  from: Date;
  to: Date;
}

export function trialStatus(
  trial: TrialWindow,
  now: Date = new Date(),
): TrialStatus {
  if (!trial.trialStartedAt || !trial.trialEndsAt) return 'NONE';
  return isTrialActive(trial, now) ? 'ACTIVE' : 'ENDED';
}

export function daysRemaining(
  trial: TrialWindow,
  now: Date = new Date(),
): number {
  return trialStatus(trial, now) === 'ACTIVE' && trial.trialEndsAt
    ? trialDaysRemaining(trial.trialEndsAt, now)
    : 0;
}

/**
 * The period the summary's "in window" metrics cover: the trial (from its
 * start to its end, or to now while still running), or — for an account
 * that never had one — the last {@link ACTIVITY_FALLBACK_WINDOW_DAYS} days.
 */
export function resolveSummaryWindow(
  trial: TrialWindow,
  now: Date = new Date(),
): SummaryWindow {
  if (trial.trialStartedAt && trial.trialEndsAt) {
    const end = Math.min(trial.trialEndsAt.getTime(), now.getTime());
    return {
      basis: 'TRIAL',
      from: trial.trialStartedAt,
      // A trial scheduled to start in the future has an empty window.
      to: new Date(Math.max(end, trial.trialStartedAt.getTime())),
    };
  }
  return {
    basis: 'RECENT',
    from: new Date(now.getTime() - ACTIVITY_FALLBACK_WINDOW_DAYS * DAY_MS),
    to: now,
  };
}

/**
 * `occurredAt` bounds for the timeline: `from`/`to` from the query,
 * intersected with the trial window when `trialOnly` is set. `null` means
 * the filter can match nothing (trial-only on an account with no trial, or
 * a range that doesn't overlap the trial).
 */
export function resolveListRange(
  query: Pick<ActivityListQuery, 'trialOnly' | 'from' | 'to'>,
  trial: TrialWindow,
): { gte?: Date; lte?: Date } | null {
  let gte = query.from ? new Date(query.from) : undefined;
  let lte = query.to ? new Date(query.to) : undefined;

  if (query.trialOnly) {
    if (!trial.trialStartedAt || !trial.trialEndsAt) return null;
    if (!gte || gte < trial.trialStartedAt) gte = trial.trialStartedAt;
    if (!lte || lte > trial.trialEndsAt) lte = trial.trialEndsAt;
  }

  if (gte && lte && gte > lte) return null;
  return { gte, lte };
}

/** Calendar date (YYYY-MM-DD) of `instant` in `timeZone`. */
export function localDate(instant: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Every local calendar date from `from` to `to` inclusive, oldest first. */
export function localDaysBetween(
  from: Date,
  to: Date,
  timeZone: string,
): string[] {
  const days = new Set<string>();
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    days.add(localDate(new Date(t), timeZone));
  }
  days.add(localDate(to, timeZone));
  return [...days].sort();
}

/** Whole days elapsed since `since` (0 on the same day), or null. */
export function daysSince(
  since: Date | null,
  now: Date = new Date(),
): number | null {
  if (!since) return null;
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY_MS));
}
