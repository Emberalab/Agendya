import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@agendya/types';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { NotificationItem } from './NotificationItem';
import { PushNotificationToggle } from './PushNotificationToggle';
import { routeForNotification } from './navigation';
import { useNotificationList } from './hooks/useNotificationList';
import { useMarkAllNotificationsRead } from './hooks/useMarkAllNotificationsRead';
import { useMarkNotificationRead } from './hooks/useMarkNotificationRead';

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const panelRef = useFocusTrap<HTMLDivElement>(true, onClose);
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationList();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const hasUnread = items.some((n) => n.readAt === null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activate = (notification: Notification) => {
    if (notification.readAt === null) {
      markRead.mutate(notification.id);
    }
    navigate(routeForNotification(notification));
    onClose();
  };

  // Portalled to <body>: the bell lives inside the sticky sidebar, which is its
  // own stacking context — without the portal the fixed panel stays trapped
  // below the main content (e.g. the agenda calendar grid).
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[190]"
        style={{
          backgroundColor: 'var(--overlay-scrim, rgba(15,23,42,0.3))',
          animation: 'agendya-fade-in 0.15s ease-out',
        }}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
        className="fixed inset-0 z-[200] flex flex-col sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[400px]"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '-8px 0 40px rgba(15,23,42,0.14)',
          animation: 'agendya-slide-in-right 0.2s ease-out',
        }}
      >
        <header
          className="flex items-center gap-3 px-4 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            className="flex-1"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--color-text-primary)',
            }}
          >
            Notificaciones
          </h2>

          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={!hasUnread || markAll.isPending}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: hasUnread
                ? 'var(--color-text-brand)'
                : 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: hasUnread ? 'pointer' : 'default',
              padding: '4px',
            }}
          >
            Marcar todas como leídas
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar notificaciones"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '4px',
              lineHeight: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <PushNotificationToggle />

        <div className="flex-1 overflow-y-auto">
          {isLoading && <SkeletonList />}

          {!isLoading && isError && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--color-danger)',
                }}
              >
                {getApiErrorMessage(error, 'No se pudieron cargar las notificaciones.')}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-brand)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                style={{
                  backgroundColor: 'var(--color-surface-soft)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path
                    d="M11 3a5 5 0 0 0-5 5v3l-1.4 1.5c-.6.6-.2 1.6.7 1.6h11.4c.9 0 1.3-1 .7-1.6L16 11V8a5 5 0 0 0-5-5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                }}
              >
                No tienes notificaciones
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                }}
              >
                Aquí verás tus nuevas citas y avisos.
              </p>
            </div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((notification) => (
                  <li key={notification.id}>
                    <NotificationItem
                      notification={notification}
                      onActivate={activate}
                    />
                  </li>
                ))}
              </ul>

              <div ref={sentinelRef} aria-hidden="true" />

              {hasNextPage && (
                <div className="flex justify-center py-3">
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-text-brand)',
                      background: 'none',
                      border: 'none',
                      cursor: isFetchingNextPage ? 'default' : 'pointer',
                      padding: '6px 12px',
                    }}
                  >
                    {isFetchingNextPage ? 'Cargando…' : 'Ver más'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function SkeletonList() {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="shrink-0 w-8 h-8 rounded-full"
            style={{
              backgroundColor: 'var(--color-surface-soft)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <span className="flex-1 flex flex-col gap-2 pt-1">
            <span
              className="h-3 rounded"
              style={{
                width: '55%',
                backgroundColor: 'var(--color-surface-soft)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <span
              className="h-3 rounded"
              style={{
                width: '85%',
                backgroundColor: 'var(--color-surface-soft)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
