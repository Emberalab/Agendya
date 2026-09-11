import { lazy, Suspense, useState } from 'react';
import { useUnreadCount } from './hooks/useUnreadCount';
import { BellIcon } from './notificationIcons';

// The panel opens on click and pulls in the notification list, its row/detail
// views and the `date-fns` Spanish locale for relative timestamps. Splitting it
// out keeps all of that off the dashboard shell's initial load — the bell,
// badge and the realtime unread-count/toast bridge don't need it.
const NotificationCenter = lazy(() =>
  import('./NotificationCenter').then((m) => ({
    default: m.NotificationCenter,
  })),
);

/**
 * Dashboard notification trigger. `icon` (default) is the compact bell+badge
 * for the mobile top bar and the collapsed sidebar rail; `row` is a full-width
 * labelled button for the expanded sidebar. Rendered in more than one place
 * (like `ThemeToggle`), but only the viewport's visible instance is
 * interactive, and the unread-count query is shared through React Query.
 */
export function NotificationBell({
  variant = 'icon',
}: {
  variant?: 'icon' | 'row';
}) {
  const [open, setOpen] = useState(false);
  const { data: count = 0 } = useUnreadCount();

  const accessibleName =
    count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones';
  const badgeText = count > 99 ? '99+' : String(count);

  return (
    <>
      {variant === 'row' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={accessibleName}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl w-full text-left"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <BellIcon size={18} />
          </span>
          Notificaciones
          {count > 0 && (
            <span
              aria-hidden="true"
              className="ml-auto shrink-0 flex items-center justify-center rounded-full"
              style={{
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--color-text-on-brand)',
                backgroundColor: 'var(--color-brand-primary)',
              }}
            >
              {badgeText}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={accessibleName}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg"
          style={{
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <BellIcon />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: '2px',
                right: '0px',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--color-text-on-brand)',
                backgroundColor: 'var(--color-brand-primary)',
                border: '2px solid var(--color-surface)',
              }}
            >
              {badgeText}
            </span>
          )}
        </button>
      )}

      {open && (
        <Suspense fallback={null}>
          <NotificationCenter onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
