import { usePushNotifications } from './hooks/usePushNotifications';

/**
 * Slim banner at the top of the notification centre that lets the professional
 * turn OS-level push notifications on or off for the current device. Renders
 * nothing when the browser can't do push or the server has no VAPID keys —
 * there is nothing actionable in those cases.
 */
export function PushNotificationToggle() {
  const { supported, serverEnabled, permission, subscribed, busy, error, enable, disable } =
    usePushNotifications();

  if (!supported || serverEnabled === false) return null;

  const blocked = permission === 'denied';
  const label = subscribed
    ? 'Notificaciones push activadas en este dispositivo'
    : blocked
      ? 'Notificaciones push bloqueadas por el navegador'
      : 'Recibe un aviso en este dispositivo cuando entre una cita';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 shrink-0"
      style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-soft)',
      }}
    >
      <span
        aria-hidden="true"
        style={{ lineHeight: 0, color: 'var(--color-text-brand)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2a4 4 0 0 0-4 4v2.5L2.8 10c-.5.5-.1 1.4.6 1.4h9.2c.7 0 1.1-.9.6-1.4L12 8.5V6a4 4 0 0 0-4-4Zm0 12a1.7 1.7 0 0 0 1.7-1.5H6.3A1.7 1.7 0 0 0 8 14Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <div className="flex-1" style={{ minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12.5px',
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
        </p>
        {error && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11.5px',
              color: 'var(--color-danger)',
              marginTop: '2px',
            }}
          >
            {error}
          </p>
        )}
      </div>

      {!blocked && (
        <button
          type="button"
          onClick={() => void (subscribed ? disable() : enable())}
          disabled={busy}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12.5px',
            fontWeight: 600,
            color: subscribed
              ? 'var(--color-text-muted)'
              : 'var(--color-text-brand)',
            background: 'none',
            border: 'none',
            cursor: busy ? 'default' : 'pointer',
            padding: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          {busy ? '…' : subscribed ? 'Desactivar' : 'Activar'}
        </button>
      )}
    </div>
  );
}
