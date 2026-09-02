import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onViewDetail: () => void;
  onReschedule: () => void;
  onContact: () => void;
  onCancel: () => void;
  canModify: boolean;
}

const MENU_WIDTH = 184;

export function ContextMenu({
  anchorRef,
  onClose,
  onViewDetail,
  onReschedule,
  onContact,
  onCancel,
  canModify,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = ref.current;
    if (!anchor || !menu) return;
    const r = anchor.getBoundingClientRect();
    const height = menu.offsetHeight || 220;

    let left = r.right - MENU_WIDTH;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));

    let top = r.bottom + 4;
    if (top + height > window.innerHeight - 8) top = Math.max(8, r.top - height - 4);

    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    const handlePointer = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleDismiss = () => onClose();
    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [onClose, anchorRef]);

  const item = (label: string, onClick: () => void, disabled = false, danger = false) => (
    <button
      key={label}
      type="button"
      onClick={() => {
        if (disabled) return;
        onClick();
        onClose();
      }}
      disabled={disabled}
      style={{
        display: 'block',
        width: '100%',
        margin: 0,
        textAlign: 'left',
        padding: '10px 16px',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        lineHeight: '20px',
        fontWeight: 500,
        color: disabled
          ? 'var(--color-text-muted)'
          : danger
            ? '#EF4444'
            : 'var(--color-text-primary)',
        background: 'none',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = danger
            ? '#FFF5F5'
            : 'var(--color-surface-soft)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      {label}
    </button>
  );

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        visibility: pos ? 'visible' : 'hidden',
        zIndex: 1000,
        width: MENU_WIDTH,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '4px 0',
        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      }}
    >
      {item('Ver detalle', onViewDetail)}
      {item('Reprogramar', onReschedule, !canModify)}
      {item('Contactar cliente', onContact)}
      <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
      {item('Cancelar cita', onCancel, !canModify, true)}
    </div>,
    document.body,
  );
}
