import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../../shared/a11y/useFocusTrap';

interface ServiceRowMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const MENU_WIDTH = 196;

export function ServiceRowMenu({
  anchorRef,
  onClose,
  onDuplicate,
  onDelete,
}: ServiceRowMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useFocusTrap(true, onClose, ref);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = ref.current;
    if (!anchor || !menu) return;
    const r = anchor.getBoundingClientRect();
    const height = menu.offsetHeight || 96;

    let left = r.right - MENU_WIDTH;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));

    let top = r.bottom + 4;
    if (top + height > window.innerHeight - 8)
      top = Math.max(8, r.top - height - 4);

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

  const item = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      type="button"
      onClick={() => {
        onClick();
        onClose();
      }}
      className="flex items-center gap-2.5 w-full"
      style={{
        margin: 0,
        textAlign: 'left',
        padding: '10px 14px',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        lineHeight: '20px',
        fontWeight: 500,
        color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = danger
          ? '#FFF5F5'
          : 'var(--color-surface-soft)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          'transparent';
      }}
    >
      {icon}
      {label}
    </button>
  );

  return createPortal(
    <div
      ref={ref}
      tabIndex={-1}
      aria-label="Más acciones"
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
        boxShadow: 'var(--shadow-menu)',
      }}
    >
      {item(
        'Duplicar servicio',
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <rect
            x="2"
            y="2"
            width="8"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <rect
            x="5"
            y="5"
            width="8"
            height="8"
            rx="1.5"
            fill="var(--color-surface)"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>,
        onDuplicate,
      )}
      {item(
        'Eliminar servicio',
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          style={{ color: 'var(--color-danger)' }}
        >
          <path
            d="M2.5 4h10M6 4V2.8h3V4M4 4l.7 8.2a1 1 0 0 0 1 .8h3.6a1 1 0 0 0 1-.8L11 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>,
        onDelete,
        true,
      )}
    </div>,
    document.body,
  );
}
