import type { ReactNode } from 'react';
import { useFocusTrap } from '../a11y/useFocusTrap';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button — for deleting, revoking, ending, cancelling. */
  destructive?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The app's one confirmation dialog — same shell as the purpose-built ones
 * (ConfirmDeleteReadDialog, the services delete dialog): scrim, focus trap,
 * Escape/scrim-click to cancel, focus restored to the trigger on close.
 * Replaces `window.confirm()`, which ignored the theme, couldn't be styled as
 * destructive, and is suppressed entirely by some browsers in installed PWAs.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-desc' : undefined}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-3xl p-7"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-dialog)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '18px',
            color: 'var(--color-text-primary)',
          }}
        >
          {title}
        </h2>
        {description && (
          <div
            id="confirm-dialog-desc"
            className="agendya-longtext"
            style={{
              fontSize: '14px',
              lineHeight: 1.55,
              color: 'var(--color-text-secondary)',
            }}
          >
            {description}
          </div>
        )}

        <div className="mt-2 flex w-full gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl px-4 py-2.5 font-semibold"
            style={{
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-soft)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl px-4 py-2.5 font-semibold"
            style={{
              fontSize: '14px',
              color: 'var(--color-text-on-brand)',
              backgroundColor: destructive
                ? 'var(--color-danger-fill)'
                : 'var(--color-brand-primary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
