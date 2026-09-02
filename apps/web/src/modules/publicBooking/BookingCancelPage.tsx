import type { BookingStatus } from '@agendya/types';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Card, CardContent } from '../../shared/components/Card';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useBookingByToken } from './hooks/useBookingByToken';
import { useCancelBookingByToken } from './hooks/useCancelBookingByToken';
import { useRescheduleBookingByToken } from './hooks/useRescheduleBookingByToken';
import { useAvailability } from './hooks/useAvailability';
import { SlotGrid } from './components/SlotGrid';

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

export function BookingCancelPage() {
  const { token = '' } = useParams();
  const { data: booking, isLoading, isError } = useBookingByToken(token);
  const cancelBooking = useCancelBookingByToken(token);
  const rescheduleBooking = useRescheduleBookingByToken(token);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState<string | null>(null);

  // Obtener disponibilidad para la nueva fecha
  const availability = useAvailability(
    booking?.professionalSlug ?? '',
    booking?.serviceId ? [booking.serviceId] : [],
    newDate,
  );

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

      {booking.status === 'CONFIRMED' && booking.canCancel && !isRescheduling && (
        <div>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => setIsRescheduling(true)}
              variant="outline"
              disabled={!booking.serviceId}
              title={
                !booking.serviceId
                  ? 'Para modificar una reserva con servicios combinados, contacta directamente'
                  : undefined
              }
            >
              Modificar fecha/hora
            </Button>
            <Button
              type="button"
              onClick={() => cancelBooking.mutate()}
              disabled={cancelBooking.isPending}
              variant="danger"
            >
              {cancelBooking.isPending ? 'Cancelando…' : 'Cancelar reserva'}
            </Button>
          </div>
          {!booking.serviceId && (
            <p className="mt-2 text-xs text-gray-500">
              💡 Para modificar la fecha/hora de esta reserva (servicios combinados), contacta directamente a {booking.businessName}
            </p>
          )}
        </div>
      )}

      {booking.status === 'CONFIRMED' && booking.canCancel && isRescheduling && (
        <div className="rounded border border-gray-200 p-4">
          <h2 className="mb-3 text-lg font-medium">Modificar fecha y hora</h2>

          <Input
            type="date"
            value={newDate}
            onChange={(e) => {
              setNewDate(e.target.value);
              setNewSlot(null);
            }}
            label="Nueva fecha"
            min={new Date().toISOString().slice(0, 10)}
          />

          {newDate && (
            <Card className="mt-4">
              <CardContent className="py-4">
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Horarios disponibles
                </p>
                <SlotGrid
                  slots={availability.data ?? []}
                  isLoading={availability.isLoading}
                  selectedSlot={newSlot}
                  onSelect={setNewSlot}
                />
              </CardContent>
            </Card>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              onClick={() => {
                if (newSlot) {
                  rescheduleBooking.mutate(newSlot, {
                    onSuccess: () => {
                      setIsRescheduling(false);
                      setNewDate('');
                      setNewSlot(null);
                    },
                  });
                }
              }}
              disabled={!newSlot || rescheduleBooking.isPending}
              variant="primary"
            >
              {rescheduleBooking.isPending ? 'Guardando…' : 'Confirmar cambio'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsRescheduling(false);
                setNewDate('');
                setNewSlot(null);
              }}
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
          {rescheduleBooking.isError && (
            <p className="mt-2 text-sm text-red-600">
              {getApiErrorMessage(rescheduleBooking.error)}
            </p>
          )}
        </div>
      )}

      {booking.status === 'CONFIRMED' && !booking.canCancel && (
        <p className="text-sm text-gray-500">
          Ya no puedes cancelar o modificar esta reserva en línea: se requieren al menos{' '}
          {booking.cancellationPolicyHours} horas de anticipación. Contacta
          directamente a {booking.businessName}.
        </p>
      )}

      {booking.status === 'CANCELLED' && (
        <p className="text-sm text-gray-500">Esta reserva ya fue cancelada.</p>
      )}

      {cancelBooking.isError && !isRescheduling && (
        <p className="mt-2 text-sm text-red-600">
          {getApiErrorMessage(cancelBooking.error)}
        </p>
      )}
    </div>
  );
}
