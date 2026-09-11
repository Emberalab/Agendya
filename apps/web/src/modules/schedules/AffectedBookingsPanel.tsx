import { lazy, Suspense, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AgendaBooking } from '@agendya/types';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useAgenda } from '../bookings/hooks/useAgenda';
import { useCancelBooking } from '../bookings/hooks/useCancelBooking';
import { useRescheduleBooking } from '../bookings/hooks/useRescheduleBooking';
import { StatusBadge } from '../bookings/statusBadge';

const RescheduleModal = lazy(() =>
  import('../bookings/RescheduleModal').then((m) => ({
    default: m.RescheduleModal,
  })),
);

function formatDayLabel(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeRange(booking: AgendaBooking): string {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

interface AffectedBookingsPanelProps {
  /** yyyy-MM-dd — the blocked date whose bookings this panel resolves. */
  date: string;
  onClose: () => void;
}

/**
 * Blocking a date never cancels or reschedules the bookings already on it
 * (see BookingsService.assertSlotWithinSchedule / SchedulesService.createException)
 * — that's a deliberate, separate action. This panel is that action: it lists
 * the bookings still sitting on a blocked date and lets the professional
 * resolve each one individually (cancel, or move it to a different day),
 * reusing the same endpoints/emails as the regular Agenda so nothing about
 * cancellation or rescheduling behaves differently just because it was
 * triggered from here.
 */
export function AffectedBookingsPanel({
  date,
  onClose,
}: AffectedBookingsPanelProps) {
  const { data: bookings, isLoading } = useAgenda(date, date);
  const cancelBooking = useCancelBooking();
  const rescheduleBooking = useRescheduleBooking();
  const [reschedulingBooking, setReschedulingBooking] =
    useState<AgendaBooking | null>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);

  const actionableBookings = (bookings ?? []).filter(
    (booking) => booking.status === 'CONFIRMED' || booking.status === 'EXPIRED',
  );
  const otherBookings = (bookings ?? []).filter(
    (booking) => !actionableBookings.includes(booking),
  );

  const mutationError = cancelBooking.error ?? rescheduleBooking.error;

  return createPortal(
    <>
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
          aria-label={`Citas del ${formatDayLabel(date)}`}
          className="w-full max-w-[560px] rounded-3xl flex flex-col overflow-hidden"
          style={{
            maxHeight: '88vh',
            backgroundColor: 'var(--color-surface-soft)',
            boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 shrink-0"
            style={{
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '18px',
                  color: 'var(--color-text-primary)',
                }}
              >
                Citas del {formatDayLabel(date)}
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  marginTop: '4px',
                }}
              >
                Esta fecha está bloqueada para nuevas reservas. Cancela o
                reprograma cada cita si lo necesitas — <b>no se modifican solas</b>.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{
                background: 'none',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 2l10 10M12 2 2 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
            {isLoading && (
              <p
                className="py-6 text-center"
                style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}
              >
                Cargando…
              </p>
            )}

            {mutationError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3"
              >
                <p
                  style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
                  className="text-red-600 dark:text-red-400"
                >
                  {getApiErrorMessage(mutationError)}
                </p>
              </div>
            ) : null}

            {!isLoading && actionableBookings.length === 0 && otherBookings.length === 0 && (
              <p
                className="py-6 text-center"
                style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}
              >
                No hay citas en esta fecha.
              </p>
            )}

            {actionableBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {booking.customerName}
                  </p>
                  <StatusBadge status={booking.status} />
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '2px',
                  }}
                >
                  {booking.serviceName}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--color-text-muted)',
                    marginBottom: '12px',
                  }}
                >
                  {formatTimeRange(booking)}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReschedulingBooking(booking)}
                    disabled={rescheduleBooking.isPending || cancelBooking.isPending}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      border: '1px solid var(--color-border)',
                      background: 'none',
                      color: 'var(--color-text-primary)',
                      cursor:
                        rescheduleBooking.isPending || cancelBooking.isPending
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    Reprogramar
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelBooking.mutate(booking.id)}
                    disabled={cancelBooking.isPending || rescheduleBooking.isPending}
                    className="px-3 py-1.5 rounded-lg"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid var(--color-danger-border)',
                      background: 'none',
                      color: 'var(--color-danger)',
                      cursor:
                        cancelBooking.isPending || rescheduleBooking.isPending
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {cancelBooking.isPending && cancelBooking.variables === booking.id
                      ? 'Cancelando…'
                      : 'Cancelar'}
                  </button>
                </div>
              </div>
            ))}

            {otherBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: 'var(--color-surface-soft)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {booking.customerName}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {booking.serviceName} · {formatTimeRange(booking)}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {reschedulingBooking && (
        <Suspense fallback={null}>
          <RescheduleModal
            booking={reschedulingBooking}
            onClose={() => setReschedulingBooking(null)}
            onConfirm={(newStartAt) =>
              rescheduleBooking.mutate(
                { id: reschedulingBooking.id, input: { newStartAt } },
                { onSuccess: () => setReschedulingBooking(null) },
              )
            }
            isLoading={rescheduleBooking.isPending}
            presentation="modal"
          />
        </Suspense>
      )}
    </>,
    document.body,
  );
}
