import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@agendya/types';
import { NotificationTypeIcon } from './notificationIcons';

/**
 * The "appointment detail" view *inside* the notification centre — the second
 * of the panel's two views (list ⇄ detail). It renders the point-in-time
 * snapshot the notification already carries (no extra fetch); "Ver en la
 * agenda" is the escape hatch to the full agenda drawer, with live status and
 * actions (reschedule / complete).
 */
export function NotificationDetailView({
  notification,
  onOpenInAgenda,
}: {
  notification: Notification;
  onOpenInAgenda: () => void;
}) {
  const { data } = notification;
  const start = data.startAt ? new Date(data.startAt) : null;
  const valid = start != null && !Number.isNaN(start.getTime());
  const when = valid
    ? `${format(start as Date, "EEEE d 'de' MMMM", { locale: es })}, ${(
        start as Date
      ).toLocaleTimeString('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`
    : '—';
  const received = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: es,
  });

  const rows: [string, string][] = [
    ['Cliente', data.customerName || '—'],
    ['Servicio', data.serviceName || '—'],
    ['Fecha y hora', when],
  ];

  return (
    <div className="px-4 py-4">
      <div className="flex gap-3">
        <span
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full mt-0.5"
          style={{
            backgroundColor: 'var(--color-surface-soft)',
            color: 'var(--color-text-brand)',
            border: '1px solid var(--color-border)',
          }}
        >
          <NotificationTypeIcon type={notification.type} />
        </span>
        <div className="min-w-0">
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {notification.title}
          </p>
          <p
            className="mt-0.5"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {notification.body}
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
            }}
          >
            Recibida {received}
          </p>
        </div>
      </div>

      <dl
        className="mt-4 rounded-xl px-4"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className="py-3"
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
              className="mt-0.5"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={onOpenInAgenda}
        className="mt-4 w-full rounded-xl px-6 py-3 font-semibold"
        style={{
          backgroundColor: 'var(--color-brand-primary)',
          color: 'var(--color-text-on-brand, #fff)',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Ver en la agenda →
      </button>

      <p
        className="mt-3 text-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        Muestra la cita tal como se reservó. Ábrela en la agenda para ver su
        estado actual.
      </p>
    </div>
  );
}
