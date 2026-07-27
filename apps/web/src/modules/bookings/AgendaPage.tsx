import type { AgendaBooking, BookingStatus } from '@agendya/types';
import { useState } from 'react';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardContent } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { CalendarGridView } from './CalendarGridView';
import { RescheduleModal } from './RescheduleModal';
import { useAgenda } from './hooks/useAgenda';
import { useCancelBooking } from './hooks/useCancelBooking';
import { useRescheduleBooking } from './hooks/useRescheduleBooking';

const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type ViewMode = 'list' | 'calendar';

export function AgendaPage() {
  const today = toDateOnly(new Date());
  const inAWeek = toDateOnly(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(inAWeek);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedBooking, setSelectedBooking] = useState<AgendaBooking | null>(
    null,
  );

  const { data: bookings, isLoading } = useAgenda(from, to);
  const cancelBooking = useCancelBooking();
  const rescheduleBooking = useRescheduleBooking();

  const getStatusVariant = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      case 'COMPLETED':
        return 'default';
      case 'NO_SHOW':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const canModifyBooking = (booking: AgendaBooking): { canModify: boolean; reason?: string } => {
    const bookingDate = new Date(booking.startAt);
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < booking.cancellationPolicyHours) {
      return {
        canModify: false,
        reason: `Debes modificar con al menos ${booking.cancellationPolicyHours} horas de anticipación`,
      };
    }

    return { canModify: true };
  };

  const handleReschedule = (newStartAt: string) => {
    if (!selectedBooking) return;

    rescheduleBooking.mutate(
      {
        id: selectedBooking.id,
        input: { newStartAt },
      },
      {
        onSuccess: () => {
          setSelectedBooking(null);
        },
      },
    );
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Tu agenda</h1>
        <p className="text-gray-600">
          Consulta y gestiona tus próximas citas.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              id="agenda-from"
              type="date"
              label="Desde"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-auto"
            />
            <Input
              id="agenda-to"
              type="date"
              label="Hasta"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-auto"
            />
            <div className="ml-auto flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                Calendario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {(cancelBooking.isError || rescheduleBooking.isError) && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-sm text-red-600">
              {getApiErrorMessage(
                cancelBooking.error || rescheduleBooking.error,
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Cargando agenda…</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && bookings?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No tienes citas en este rango de fechas.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && bookings && bookings.length > 0 && (
        <>
          {viewMode === 'list' && (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <Card key={booking.id} hover className="transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {new Date(booking.startAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                          <Badge variant={getStatusVariant(booking.status)} size="sm">
                            {STATUS_LABELS[booking.status]}
                          </Badge>
                        </div>
                        <p className="mb-1 text-gray-900">
                          {booking.serviceName}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">{booking.customerName}</span> ·{' '}
                          {booking.customerPhone}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.customerEmail}
                        </p>
                      </div>
                      {booking.status === 'CONFIRMED' && (() => {
                        const modifyCheck = canModifyBooking(booking);
                        return (
                          <div className="flex flex-col items-end gap-2">
                            {!modifyCheck.canModify && modifyCheck.reason && (
                              <p className="text-xs text-gray-500 italic">
                                {modifyCheck.reason}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedBooking(booking)}
                                disabled={!modifyCheck.canModify}
                                title={modifyCheck.reason}
                              >
                                Modificar
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => cancelBooking.mutate(booking.id)}
                                disabled={cancelBooking.isPending || !modifyCheck.canModify}
                                title={!modifyCheck.canModify ? modifyCheck.reason : undefined}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {viewMode === 'calendar' && (
            <CalendarGridView
              bookings={bookings}
              from={from}
              to={to}
              onBookingClick={setSelectedBooking}
            />
          )}
        </>
      )}

      {selectedBooking && (
        <RescheduleModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onConfirm={handleReschedule}
          isLoading={rescheduleBooking.isPending}
        />
      )}
    </div>
  );
}
