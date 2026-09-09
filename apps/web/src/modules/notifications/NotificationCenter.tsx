import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@agendya/types';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { usePrefersReducedMotion } from '../../shared/a11y/prefersReducedMotion';
import { useToastStore } from '../../shared/notifications/toastStore';
import { NotificationItem } from './NotificationItem';
import { NotificationDetailView } from './NotificationDetailView';
import { ConfirmDeleteReadDialog } from './ConfirmDeleteReadDialog';
import { routeForNotification } from './navigation';
import { useNotificationList } from './hooks/useNotificationList';
import { useMarkAllNotificationsRead } from './hooks/useMarkAllNotificationsRead';
import { useMarkNotificationRead } from './hooks/useMarkNotificationRead';
import { useDeleteNotification } from './hooks/useDeleteNotification';
import { useDeleteReadNotifications } from './hooks/useDeleteReadNotifications';

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  // Two views inside the one panel: the list, and one notification's detail.
  const [detail, setDetail] = useState<Notification | null>(null);
  const [confirmDeleteRead, setConfirmDeleteRead] = useState(false);
  // Row to restore focus to when returning from the detail view.
  const lastActivatedId = useRef<string | null>(null);

  const reducedMotion = usePrefersReducedMotion();
  // Rows currently playing their exit animation. The optimistic cache removal
  // for a single delete is deferred until its animation reports done, so the
  // slide-out is never cut short by an early unmount.
  const [exitingIds, setExitingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Ids animating out as part of a "Eliminar leídas" run — those stay collapsed
  // (not re-committed row by row) until the bulk request settles.
  const bulkExitingIds = useRef<Set<string>>(new Set());

  // Disable the panel's own focus trap while the confirm dialog owns focus —
  // same pattern as the agenda drawer's ConfirmCompleteDialog.
  const panelRef = useFocusTrap<HTMLDivElement>(!confirmDeleteRead, onClose);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

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
  const { requestDelete } = useDeleteNotification();
  const deleteRead = useDeleteReadNotifications();
  const pushToast = useToastStore((state) => state.push);

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const hasUnread = items.some((n) => n.readAt === null);
  const readCount = items.filter((n) => n.readAt !== null).length;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || detail) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, detail]);

  // Move focus sensibly across the list ⇄ detail transition.
  useEffect(() => {
    if (detail) {
      backBtnRef.current?.focus();
      return;
    }
    if (lastActivatedId.current) {
      const row = bodyRef.current?.querySelector<HTMLButtonElement>(
        `[data-notification-id="${lastActivatedId.current}"] button`,
      );
      (row ?? bodyRef.current)?.focus();
      lastActivatedId.current = null;
    }
  }, [detail]);

  const activate = (notification: Notification) => {
    if (notification.readAt === null) {
      markRead.mutate(notification.id);
    }
    lastActivatedId.current = notification.id;
    // Open the detail *inside* the panel — no route change, no panel close.
    setDetail(notification);
  };

  const openInAgenda = () => {
    if (!detail) return;
    navigate(routeForNotification(detail));
    onClose();
  };

  // Click "Eliminar" on a read row → start its exit animation. The actual
  // optimistic removal + undo toast fire from `handleExited` once the animation
  // finishes. Under reduced motion there is no animation, so commit right away.
  const handleDeleteOne = useCallback(
    (notification: Notification) => {
      if (exitingIds.has(notification.id)) return;
      if (reducedMotion) {
        requestDelete(notification);
        return;
      }
      setExitingIds((prev) => new Set(prev).add(notification.id));
    },
    [exitingIds, reducedMotion, requestDelete],
  );

  const handleExited = useCallback(
    (notification: Notification) => {
      if (bulkExitingIds.current.has(notification.id)) {
        // Part of a bulk run — leave it collapsed; the mutation prunes the
        // cache (or, on failure, `exitingIds` is cleared and it springs back).
        return;
      }
      setExitingIds((prev) => {
        if (!prev.has(notification.id)) return prev;
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
      requestDelete(notification);
    },
    [requestDelete],
  );

  const bulkDeleteFailed = () => {
    pushToast({
      title: 'No se pudieron eliminar las notificaciones leídas.',
      durationMs: 5_000,
    });
  };

  const confirmBulkDelete = () => {
    const readIds = items.filter((n) => n.readAt !== null).map((n) => n.id);

    if (reducedMotion || readIds.length === 0) {
      deleteRead.mutate(undefined, {
        onError: bulkDeleteFailed,
        onSettled: () => setConfirmDeleteRead(false),
      });
      return;
    }

    // Fade/slide every read row out together, then let the request prune them.
    bulkExitingIds.current = new Set(readIds);
    setExitingIds((prev) => new Set([...prev, ...readIds]));
    setConfirmDeleteRead(false);
    const clearBulk = () => {
      bulkExitingIds.current = new Set();
      setExitingIds((prev) => {
        const next = new Set(prev);
        for (const id of readIds) next.delete(id);
        return next;
      });
    };
    deleteRead.mutate(undefined, {
      // Success: the hook has pruned the cache, so the rows are already gone —
      // just drop the now-stale bookkeeping. Failure: clear it so the collapsed
      // rows animate back open, and tell the user.
      onSuccess: clearBulk,
      onError: () => {
        clearBulk();
        bulkDeleteFailed();
      },
    });
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
          className="flex items-center gap-2 px-3 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {detail ? (
            <>
              <button
                ref={backBtnRef}
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Volver a notificaciones"
                className="rounded-md p-1"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  lineHeight: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M11 3.5 5.5 9l5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <h2
                className="flex-1 px-1"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: 'var(--color-text-primary)',
                }}
              >
                Detalle de la cita
              </h2>
            </>
          ) : (
            <>
              <h2
                className="flex-1 px-1"
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
            </>
          )}

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

        {/* Detail view — the list stays mounted below (just hidden) so its
            scroll position, loaded pages and infinite-scroll state survive. */}
        {detail && (
          <div className="flex-1 overflow-y-auto">
            <NotificationDetailView
              notification={detail}
              onOpenInAgenda={openInAgenda}
            />
          </div>
        )}

        <div
          ref={bodyRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto"
          hidden={detail !== null}
        >
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
                      onDelete={handleDeleteOne}
                      exiting={exitingIds.has(notification.id)}
                      onExited={handleExited}
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

        {/* Bulk action — only while there is something it can act on. Sticky to
            the panel's bottom so it is reachable without scrolling the feed. */}
        {!detail && readCount > 0 && (
          <div
            className="shrink-0 flex justify-center px-4 py-2.5"
            style={{
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <button
              type="button"
              onClick={() => setConfirmDeleteRead(true)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-danger)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Eliminar leídas
            </button>
          </div>
        )}
      </div>

      {confirmDeleteRead && (
        <ConfirmDeleteReadDialog
          count={readCount}
          pending={deleteRead.isPending}
          onConfirm={confirmBulkDelete}
          onCancel={() => setConfirmDeleteRead(false)}
        />
      )}
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
