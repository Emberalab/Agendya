import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Notification } from '@agendya/types';
import { NotificationTypeIcon } from './notificationIcons';

function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

/**
 * One row in the notification centre. It's a `<button>` (real button
 * semantics + keyboard support). Read/unread is conveyed three
 * non-colour-only ways: a filled dot, a "Nuevo" tag, and bold weight — plus
 * the accessible name is prefixed with "Sin leer." while unread.
 */
export function NotificationItem({
  notification,
  onActivate,
}: {
  notification: Notification;
  onActivate: (notification: Notification) => void;
}) {
  const unread = notification.readAt === null;
  const when = relativeTime(notification.createdAt);

  return (
    <button
      type="button"
      onClick={() => onActivate(notification)}
      aria-label={`${unread ? 'Sin leer. ' : ''}${notification.title}. ${notification.body}. ${when}`}
      className="w-full text-left flex gap-3 px-4 py-3.5"
      style={{
        background: unread ? 'var(--color-brand-tint)' : 'transparent',
        borderLeft: `3px solid ${unread ? 'var(--color-brand-primary)' : 'transparent'}`,
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
      }}
    >
      <span
        className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full mt-0.5"
        style={{
          backgroundColor: 'var(--color-surface-soft)',
          color: 'var(--color-text-brand)',
          border: '1px solid var(--color-border)',
        }}
      >
        <NotificationTypeIcon type={notification.type} />
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          {unread && (
            <span
              aria-hidden="true"
              className="shrink-0 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            />
          )}
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: unread ? 700 : 500,
              color: 'var(--color-text-primary)',
            }}
          >
            {notification.title}
          </span>
          {unread && (
            <span
              aria-hidden="true"
              className="shrink-0 rounded-full px-1.5 py-0.5"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-text-on-brand)',
                backgroundColor: 'var(--color-brand-primary)',
              }}
            >
              Nuevo
            </span>
          )}
        </span>
        <span
          className="block mt-0.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.45,
          }}
        >
          {notification.body}
        </span>
        <time
          dateTime={notification.createdAt}
          className="block mt-1"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
          }}
        >
          {when}
        </time>
      </span>
    </button>
  );
}
