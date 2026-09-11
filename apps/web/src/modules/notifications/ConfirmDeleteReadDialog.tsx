import { useFocusTrap } from '../../shared/a11y/useFocusTrap';

/**
 * Confirmation for the destructive "Eliminar leídas" bulk action. Modeled on
 * `ConfirmCompleteDialog` in the agenda drawer — same focus trap, Escape-to-
 * cancel, and focus restoration to the trigger on close.
 */
export function ConfirmDeleteReadDialog({
  count,
  pending,
  onConfirm,
  onCancel,
}: {
  count: number;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onCancel);

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-read-title"
        aria-describedby="confirm-delete-read-desc"
        onClick={(event) => event.stopPropagation()}
        className="rounded-3xl p-7 flex flex-col items-center gap-3 w-full max-w-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
        }}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-danger-surface)' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0 .7 9.2A1.5 1.5 0 0 0 8.2 16.6h3.6a1.5 1.5 0 0 0 1.5-1.4L14 6"
              stroke="var(--color-danger)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          id="confirm-delete-read-title"
          className="text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '18px',
            color: 'var(--color-text-primary)',
          }}
        >
          ¿Eliminar notificaciones leídas?
        </h2>
        <p
          id="confirm-delete-read-desc"
          className="text-center"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.55,
          }}
        >
          Se eliminarán las {count} notificaciones que ya has leído. Las que no
          has leído se conservan.
        </p>

        <div className="mt-2 flex gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-xl px-4 py-2.5 font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-soft)',
              border: '1px solid var(--color-border)',
              cursor: pending ? 'default' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 rounded-xl px-4 py-2.5 font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#fff',
              backgroundColor: 'var(--color-danger-fill)',
              border: 'none',
              cursor: pending ? 'default' : 'pointer',
            }}
          >
            {pending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
