import type { AgendaBooking } from '@agendya/types';
import { useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { useProfile } from '../professionals/hooks/useProfile';
import { useAvailability } from '../publicBooking/hooks/useAvailability';
import { SlotGrid } from '../publicBooking/components/SlotGrid';

interface RescheduleModalProps {
  booking: AgendaBooking;
  onClose: () => void;
  onConfirm: (newStartAt: string) => void;
  isLoading?: boolean;
}

export function RescheduleModal({
  booking,
  onClose,
  onConfirm,
  isLoading,
}: RescheduleModalProps) {
  const currentDate = new Date(booking.startAt);
  const [newDate, setNewDate] = useState(currentDate.toISOString().slice(0, 10));
  const [newSlot, setNewSlot] = useState<string | null>(null);

  // Obtener slug del profesional actual
  const { data: profile } = useProfile();

  // Obtener disponibilidad para la nueva fecha
  const availability = useAvailability(
    profile?.slug ?? '',
    booking.serviceId ? [booking.serviceId] : [],
    newDate,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSlot) {
      onConfirm(newSlot);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Modificar fecha y hora</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-gray-600">
                <strong>Cliente:</strong> {booking.customerName}
              </p>
              <p className="mb-2 text-sm text-gray-600">
                <strong>Servicio:</strong> {booking.serviceName}
              </p>
              <p className="mb-4 text-sm text-gray-600">
                <strong>Fecha actual:</strong>{' '}
                {currentDate.toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            <Input
              id="newDate"
              type="date"
              label="Nueva fecha"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setNewSlot(null);
              }}
              min={new Date().toISOString().slice(0, 10)}
              required
            />

            {newDate && (
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Horarios disponibles
                </p>
                <SlotGrid
                  slots={availability.data ?? []}
                  isLoading={availability.isLoading}
                  selectedSlot={newSlot}
                  onSelect={setNewSlot}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={!newSlot || isLoading}
              >
                {isLoading ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
