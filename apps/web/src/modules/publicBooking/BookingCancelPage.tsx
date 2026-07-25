import type { BookingStatus } from '@ronda/types';
import { useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useBookingByToken } from './hooks/useBookingByToken';
import { useCancelBookingByToken } from './hooks/useCancelBookingByToken';

const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

export function BookingCancelPage() {
  const { token = '' } = useParams();
  const { data: booking, isLoading, isError } = useBookingByToken(token);
  const cancelBooking = useCancelBookingByToken(token);

  if (isLoading) {
    return <p className="p-6 text-center">Cargando…</p>;
  }

  if (isError || !booking) {
    return (
      <p className="p-6 text-center text-red-600">
        No encontramos esta reserva.
      </p>
    );
  }

  const formattedDate = new Date(booking.startAt).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Tu reserva</h1>
      <div className="mb-6 rounded border border-gray-200 p-4">
        <p className="font-medium">{booking.serviceName}</p>
        <p className="text-sm text-gray-600">con {booking.businessName}</p>
        <p className="mt-2 text-sm text-gray-600">{formattedDate}</p>
        <p className="mt-2 text-sm">
          Estado:{' '}
          <span className="font-medium">{STATUS_LABELS[booking.status]}</span>
        </p>
      </div>

      {booking.status === 'CONFIRMED' && booking.canCancel && (
        <button
          type="button"
          onClick={() => cancelBooking.mutate()}
          disabled={cancelBooking.isPending}
          className="rounded border border-red-300 px-4 py-2 text-red-600 disabled:opacity-50"
        >
          {cancelBooking.isPending ? 'Cancelando…' : 'Cancelar reserva'}
        </button>
      )}

      {booking.status === 'CONFIRMED' && !booking.canCancel && (
        <p className="text-sm text-gray-500">
          Ya no puedes cancelar esta reserva en línea: se requieren al menos{' '}
          {booking.cancellationPolicyHours} horas de anticipación. Contacta
          directamente a {booking.businessName}.
        </p>
      )}

      {booking.status === 'CANCELLED' && (
        <p className="text-sm text-gray-500">Esta reserva ya fue cancelada.</p>
      )}

      {cancelBooking.isError && (
        <p className="mt-2 text-sm text-red-600">
          {getApiErrorMessage(cancelBooking.error)}
        </p>
      )}
    </div>
  );
}
