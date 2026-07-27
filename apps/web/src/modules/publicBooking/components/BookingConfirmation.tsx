import type { PublicBooking } from '@agendya/types';
import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card, CardContent } from '../../../shared/components/Card';

export function BookingConfirmation({ booking }: { booking: PublicBooking }) {
  const [copied, setCopied] = useState(false);
  const cancelLink = `${window.location.origin}/bookings/${booking.cancellationToken}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cancelLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(booking.startAt).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="py-6 text-center">
        <h2 className="mb-2 text-xl font-semibold text-green-800">
          ¡Reserva confirmada!
        </h2>
        <p className="mb-1 text-gray-900">
          {booking.serviceName} con {booking.businessName}
        </p>
        <p className="mb-4 text-sm text-gray-600">{formattedDate}</p>
        <p className="mb-3 text-sm text-gray-600">
          Te enviamos la confirmación a {booking.customerEmail}. Si necesitas
          cancelar, guarda este enlace:
        </p>
        <div className="mb-2 flex items-center gap-2 rounded border border-gray-200 bg-white p-2">
          <span className="flex-1 truncate text-left text-sm text-gray-700">
            {cancelLink}
          </span>
          <Button
            type="button"
            onClick={handleCopy}
            variant="primary"
            size="sm"
          >
            {copied ? '¡Copiado!' : 'Copiar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
