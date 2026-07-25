import type { PublicBooking } from '@ronda/types';
import { useState } from 'react';

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
    <div className="rounded border border-green-200 bg-green-50 p-6 text-center">
      <h2 className="mb-2 text-xl font-semibold text-green-800">
        ¡Reserva confirmada!
      </h2>
      <p className="mb-1">
        {booking.serviceName} con {booking.businessName}
      </p>
      <p className="mb-4 text-sm text-gray-600">{formattedDate}</p>
      <p className="mb-2 text-sm text-gray-600">
        Te enviamos la confirmación a {booking.customerEmail}. Si necesitas
        cancelar, guarda este enlace:
      </p>
      <div className="mb-2 flex items-center gap-2 rounded border border-gray-200 bg-white p-2">
        <span className="flex-1 truncate text-sm">{cancelLink}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-black px-3 py-1 text-sm whitespace-nowrap text-white"
        >
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}
