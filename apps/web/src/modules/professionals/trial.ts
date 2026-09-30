import { trialDaysRemaining, type TrialInfo } from '@agendya/types';

/**
 * Display helpers for the full-access trial. Display only: whether the trial
 * is active comes from the API (`profile.trial.active`), never from the
 * browser clock. Dates render in the professional's time zone, not the
 * browser's.
 */

/** "1 de octubre" (or "1 de octubre de 2026" with `withYear`). */
export function formatTrialDate(
  iso: string,
  timeZone: string,
  withYear = false,
): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' as const } : {}),
    timeZone,
  });
}

/** "12 días", "1 día" or "menos de un día". */
export function trialRemainingLabel(
  trial: Pick<TrialInfo, 'endsAt'>,
  now: Date = new Date(),
): string {
  const ms = new Date(trial.endsAt).getTime() - now.getTime();
  if (ms < 24 * 60 * 60 * 1000) {
    return 'menos de un día';
  }
  const days = trialDaysRemaining(new Date(trial.endsAt), now);
  return days === 1 ? '1 día' : `${days} días`;
}
