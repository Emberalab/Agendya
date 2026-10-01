import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';

interface MobileAccountMenuProps {
  initial: string;
  name: string;
  email: string;
  onLogout: () => void;
}

/**
 * Below `lg` the sidebar — which held the only "Cerrar sesión" button — is
 * hidden, so on phones, tablets and the installed PWA there was no way to sign
 * out at all. The avatar in the mobile top bar now opens this account menu
 * instead of being a decorative circle. Same menu language as the agenda's
 * ContextMenu (surface, border, --shadow-menu, 44px rows).
 */
export function MobileAccountMenu({
  initial,
  name,
  email,
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

  const rowStyle = {
    minHeight: '44px',
    fontSize: '14px',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
  } as const;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Cuenta de ${name || 'tu negocio'}`}
        onClick={() => setOpen((value) => !value)}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'var(--color-brand-primary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            color: 'var(--color-text-on-brand)',
          }}
        >
          {initial}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Cuenta"
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl p-2"
          style={{
            zIndex: 60,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-menu)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <div className="px-3 py-2">
            <p
              className="truncate"
              style={{
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--color-text-primary)',
              }}
            >
              {name}
            </p>
            <p
              className="truncate"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
              }}
            >
              {email}
            </p>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              margin: '4px 0',
            }}
          />
          <Link
            to="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 hover:bg-[var(--color-surface-soft)]"
            style={{ ...rowStyle, color: 'var(--color-text-primary)' }}
          >
            Perfil y plan
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 text-left hover:bg-[var(--color-danger-surface)]"
            style={{ ...rowStyle, color: 'var(--color-danger)' }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
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
