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
import { useConfirmDialog } from '../../shared/components/useConfirmDialog';

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
  EXPIRED: 'Vencida',
};

export function BookingCancelPage() {
  const { token = '' } = useParams();
  const { data: booking, isLoading, isError } = useBookingByToken(token);
  const cancelBooking = useCancelBookingByToken(token);
  const rescheduleBooking = useRescheduleBookingByToken(token);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  // Obtener disponibilidad para la nueva fecha
  const availability = useAvailability(
    booking?.professionalSlug ?? '',
    booking?.serviceId ? [booking.serviceId] : [],
    newDate,
  );

  if (isLoading) {
    return (
      <p
        role="status"
        className="p-6 text-center text-sm"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
      >
        Cargando…
      </p>
    );
  }

  if (isError || !booking) {
    return (
      <main
        className="mx-auto max-w-md px-4 py-10 text-center"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <p role="alert" className="text-sm" style={{ color: 'var(--color-danger)' }}>
          No encontramos esta reserva.
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Revisa que el enlace esté completo o contacta directamente al negocio.
        </p>
      </main>
    );
  }

  // Spanish like the rest of the page (was the browser's locale, so an
  // English-language phone got "Monday, August 3…" mid-Spanish copy).
  const formattedDate = new Date(booking.startAt).toLocaleString('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <main
      className="mx-auto max-w-md px-4 py-10"
      style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}
    >
      <h1
        className="mb-4 text-2xl"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
      >
        Tu reserva
      </h1>
      <Card className="mb-6" padding="sm">
        <p className="font-semibold">{booking.serviceName}</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          con {booking.businessName}
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {formattedDate}
        </p>
        <p className="mt-3 text-sm">
          Estado:{' '}
          <span className="font-semibold">{STATUS_LABELS[booking.status]}</span>
        </p>
      </Card>

      {booking.status === 'CONFIRMED' && booking.canCancel && !isRescheduling && (
        <div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {booking.canReschedule && (
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
            )}
            {/* Cancelling is irreversible and this page is reached from a
                single link in an email/WhatsApp — a stray tap used to cancel
                immediately. */}
            <Button
              type="button"
              onClick={async () => {
                const confirmed = await confirm({
                  title: '¿Cancelar tu reserva?',
                  description: `${booking.serviceName} con ${booking.businessName}, ${formattedDate}. Esta acción no se puede deshacer.`,
                  confirmLabel: 'Sí, cancelar',
                  cancelLabel: 'Volver',
                  destructive: true,
                });
                if (confirmed) cancelBooking.mutate();
              }}
              disabled={cancelBooking.isPending}
              variant="danger"
            >
              {cancelBooking.isPending ? 'Cancelando…' : 'Cancelar reserva'}
            </Button>
          </div>
          {!booking.serviceId && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Para modificar la fecha/hora de esta reserva (servicios combinados), contacta directamente a {booking.businessName}
            </p>
          )}
        </div>
      )}

      {booking.status === 'CONFIRMED' && booking.canReschedule && isRescheduling && (
        <Card padding="sm">
          <h2
            className="mb-3 text-lg"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Modificar fecha y hora
          </h2>

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
            <Card className="mt-4" padding="sm">
              <CardContent>
                <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
            <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>
              {getApiErrorMessage(rescheduleBooking.error)}
            </p>
          )}
        </Card>
      )}

      {booking.status === 'CONFIRMED' && !booking.canCancel && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Ya no puedes cancelar o modificar esta reserva en línea: se requieren al menos{' '}
          {booking.cancellationPolicyHours} horas de anticipación. Contacta
          directamente a {booking.businessName}.
        </p>
      )}

      {booking.status === 'EXPIRED' && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Esta reserva ya venció: su horario ya pasó. Contacta directamente a{' '}
          {booking.businessName} si necesitas agendar una nueva cita.
        </p>
      )}

      {booking.status === 'CANCELLED' && (
        <p role="status" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Esta reserva ya fue cancelada.
        </p>
      )}

      {cancelBooking.isError && !isRescheduling && (
        <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>
          {getApiErrorMessage(cancelBooking.error)}
        </p>
      )}
      {confirmDialog}
    </main>
  );
}
