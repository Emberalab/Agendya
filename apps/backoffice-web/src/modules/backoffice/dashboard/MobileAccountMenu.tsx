import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../../shared/a11y/useFocusTrap';

interface MobileAccountMenuProps {
  initial: string;
  name: string;
  detail: string;
  onLogout: () => void;
}

// Below `lg` the sidebar (and with it the only "Cerrar sesión" button) is
// hidden, which left phone/tablet users with no way to sign out. The avatar in
// the mobile top bar now opens this small account menu instead of being a
// decorative circle. Mirrors apps/web's dashboard MobileAccountMenu.
export function MobileAccountMenu({
  initial,
  name,
  detail,
  onLogout,
}: MobileAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useFocusTrap<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Cuenta de ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 items-center justify-center rounded-full bg-brand-primary"
      >
        <span aria-hidden="true" className="text-xs font-bold text-on-brand">
          {initial}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Cuenta"
          className="absolute top-full right-0 z-[60] mt-2 w-60 rounded-xl border border-border bg-surface p-2 shadow-menu"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-text-primary">
              {name}
            </p>
            <p className="truncate text-xs text-text-muted">{detail}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-danger-surface hover:text-danger"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M12 13l4-4-4-4M16 9H7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
