import { useEffect } from 'react';
import { Snackbar } from '@moondesignsystem/react';
import { useToastStore, type Toast } from './toastStore';

/**
 * Renders the toast queue as a fixed stack, using the design system's
 * `Snackbar` as the visual shell. Mounted once, in the dashboard shell.
 */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-4 right-4 bottom-20 z-[60] flex flex-col gap-2 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[380px]"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (!toast.durationMs) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, onDismiss]);

  const clickable = Boolean(toast.onClick);

  return (
    <Snackbar isOpen variant="fill" context="info">
      <div className="flex w-full items-start gap-3">
        <button
          type="button"
          onClick={() => {
            toast.onClick?.();
            onDismiss(toast.id);
          }}
          disabled={!clickable}
          className="flex-1 text-left"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: clickable ? 'pointer' : 'default',
            color: 'inherit',
            font: 'inherit',
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px' }}>
            {toast.title}
          </p>
          {toast.description && (
            <Snackbar.Meta>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                {toast.description}
              </span>
            </Snackbar.Meta>
          )}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Descartar notificación"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
            padding: '2px',
            lineHeight: 0,
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </Snackbar>
  );
}
