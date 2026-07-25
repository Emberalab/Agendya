import type { BookingStatus } from '@ronda/types';
import { useState } from 'react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useAgenda } from './hooks/useAgenda';
import { useCancelBooking } from './hooks/useCancelBooking';

const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function AgendaPage() {
  const today = toDateOnly(new Date());
  const inAWeek = toDateOnly(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(inAWeek);

  const { data: bookings, isLoading } = useAgenda(from, to);
  const cancelBooking = useCancelBooking();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Tu agenda</h1>
      <p className="mb-6 text-sm text-gray-500">
        Consulta y gestiona tus próximas citas.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-2">
        <div>
          <label
            htmlFor="agenda-from"
            className="mb-1 block text-sm font-medium"
          >
            Desde
          </label>
          <input
            id="agenda-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="agenda-to" className="mb-1 block text-sm font-medium">
            Hasta
          </label>
          <input
            id="agenda-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      {cancelBooking.isError && (
        <p className="mb-4 text-sm text-red-600">
          {getApiErrorMessage(cancelBooking.error)}
        </p>
      )}

      {isLoading && <p>Cargando agenda…</p>}
      {!isLoading && bookings?.length === 0 && (
        <p className="text-sm text-gray-500">
          No tienes citas en este rango de fechas.
        </p>
      )}
      {!isLoading && bookings && bookings.length > 0 && (
        <ul>
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex items-center justify-between gap-2 border-b border-gray-200 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {new Date(booking.startAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                <p className="text-sm">
                  {booking.serviceName} — {booking.customerName}
                </p>
                <p className="text-xs text-gray-500">
                  {booking.customerPhone} · {booking.customerEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {STATUS_LABELS[booking.status]}
                </span>
                {booking.status === 'CONFIRMED' && (
                  <button
                    type="button"
                    onClick={() => cancelBooking.mutate(booking.id)}
                    disabled={cancelBooking.isPending}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
