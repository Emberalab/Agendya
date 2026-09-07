import type { Booking, Professional } from '@prisma/client';

/**
 * Pure booking-policy predicates: the "can this booking still be touched?"
 * rules, with no database, mail, or framework dependencies. Kept separate from
 * {@link BookingsService} so the cancellation-window / modifiability logic can
 * be unit-tested directly instead of through the full service graph.
 */

/**
 * A booking's scheduled start has already happened. Both sides are absolute
 * instants (UTC epoch millis under the hood), so this comparison is
 * timezone-safe by construction — no wall-clock/zone conversion needed here.
 * Zone conversion only matters when *interpreting* a wall-clock time (working
 * hours, "today" in the professional's calendar), which is handled separately
 * by zonedInstant/zonedDateParts.
 */
export function isPast(instant: Date): boolean {
  return instant.getTime() <= Date.now();
}

/**
 * The booking still starts far enough in the future to satisfy the
 * professional's minimum-notice window for a customer-initiated change.
 */
export function meetsCancellationWindow(
  startAt: Date,
  cancellationPolicyHours: number,
): boolean {
  const hoursUntilStart = (startAt.getTime() - Date.now()) / 3_600_000;
  return hoursUntilStart >= cancellationPolicyHours;
}

/**
 * Whether a booking can currently be cancelled or rescheduled: confirmed, its
 * start time hasn't passed, and it's still outside the cancellation policy's
 * minimum-notice window. Used both for the read-side `canCancel`/`canReschedule`
 * flags and (via `BookingsService.assertModifiable`) as the server-side gate
 * the mutating endpoints enforce.
 */
export function isModifiable(
  booking: Booking,
  professional: Professional,
): boolean {
  return (
    booking.status === 'CONFIRMED' &&
    !isPast(booking.startAt) &&
    meetsCancellationWindow(
      booking.startAt,
      professional.cancellationPolicyHours,
    )
  );
}
