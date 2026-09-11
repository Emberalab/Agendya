import type { PublicBooking } from '@agendya/types';
import { formatDuration } from '../../services/format';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function BookingConfirmedView({
  booking,
  onDone,
  onEdit,
}: {
  booking: PublicBooking;
  onDone: () => void;
  onEdit: () => void;
}) {
  const rows: [string, string][] = [
    ['PROFESIONAL', booking.businessName],
    ['SERVICIO', booking.serviceName],
    ['MODALIDAD', booking.atHome ? 'A domicilio' : 'En el establecimiento'],
  ];
  if (booking.atHome && booking.customerAddress) {
    rows.push(['DIRECCIÓN', booking.customerAddress]);
  }
  rows.push(
    [
      'FECHA',
      capitalize(
        new Date(booking.startAt).toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
      ),
    ],
    ['HORA', `${formatTime(booking.startAt)} – ${formatTime(booking.endAt)}`],
    ['DURACIÓN', formatDuration(booking.durationMinutes)],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: '#DCFCE7' }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16A34A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h1
            className="mt-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '26px',
              color: 'var(--color-text-primary)',
            }}
          >
            Tu cita está confirmada
          </h1>
          <p
            className="mt-2 max-w-xs"
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Te enviamos los detalles de tu cita al correo registrado.
          </p>
        </div>

        <dl
          className="mt-6 overflow-hidden rounded-2xl"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className="px-5 py-4"
              style={{
                borderTop:
                  index === 0 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <dt
                className="agendia-label"
                style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
              >
                {label}
              </dt>
              <dd
                className="agendya-longtext mt-0.5"
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl px-6 py-3.5 font-semibold"
            style={{
              backgroundColor: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 8px 18px -8px rgba(79,70,229,0.55)',
            }}
          >
            Listo
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-xl px-6 py-3 font-semibold"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-brand)',
              border: '1px solid var(--color-border)',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Editar cita
          </button>
        </div>
      </div>
    </div>
  );
}
