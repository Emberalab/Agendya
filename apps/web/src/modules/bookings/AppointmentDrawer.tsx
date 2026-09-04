import type { AgendaBooking } from '@agendya/types';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { STATUS_CFG } from './statusConfig';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function cancelledByLabel(by: string | null): string {
  if (by === 'customer') return 'Cancelada por el cliente';
  if (by === 'professional') return 'Cancelada por ti';
  return 'Cita cancelada';
}

type Presentation = 'drawer' | 'modal';

interface AppointmentDrawerProps {
  booking: AgendaBooking | null;
  onClose: () => void;
  onReschedule: (booking: AgendaBooking) => void;
  onComplete: (id: string) => void;
  completePending: boolean;
  /** `drawer` slides in from the right (list view); `modal` is centered (calendar view). */
  presentation?: Presentation;
}

function ConfirmCompleteDialog({
  booking,
  pending,
  onConfirm,
  onCancel,
}: {
  booking: AgendaBooking;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onCancel);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Marcar como completada"
        className="rounded-3xl p-8 flex flex-col items-center gap-4 w-full max-w-sm"
        style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 24px 64px rgba(15,23,42,0.18)' }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-surface)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 11l4.5 4.5L17 6" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2
          className="text-center"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--color-text-primary)' }}
        >
          ¿Marcar como completada?
        </h2>
        <p
          className="text-center"
          style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.55' }}
        >
          La cita de <strong style={{ color: 'var(--color-text-primary)' }}>{booking.serviceName}</strong> con{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>{booking.customerName}</strong> será marcada como completada.
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onCancel}
            disabled={pending}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Guardando…' : 'Completar cita'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)' }}>{text}</span>
    </div>
  );
}

export function AppointmentDrawer({
  booking,
  onClose,
  onReschedule,
  onComplete,
  completePending,
  presentation = 'drawer',
}: AppointmentDrawerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  // Deactivated while the nested "mark as completed" confirm dialog is open,
  // so its own trap (not this one) owns Escape/Tab until it closes.
  const dialogRef = useFocusTrap<HTMLDivElement>(!!booking && !showConfirm, onClose);

  if (!booking) return null;

  const cfg = STATUS_CFG[booking.status];
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const created = new Date(booking.createdAt);

  const statusBadge = (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ fontFamily: 'var(--font-body)', backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );

  const body = (
    <>
      {booking.status === 'CANCELLED' && (
        <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-danger-surface)', border: '1px solid var(--color-danger-border)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--color-danger)' }}>
            {cancelledByLabel(booking.cancelledBy)}
            {booking.cancelledAt
              ? ` · ${format(new Date(booking.cancelledAt), "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })}`
              : ''}
          </p>
        </div>
      )}

      {/* Service card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--color-text-primary)', marginBottom: '12px' }}
        >
          {booking.serviceName}
        </h3>

        {booking.status === 'COMPLETED' && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--color-success)' }}>
              Servicio completado
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <InfoRow
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M4.5 1v2.5M9.5 1v2.5M1 5.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            }
            text={format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          />
          <InfoRow
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 4v3.2l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            }
            text={`${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`}
          />
          <InfoRow
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            }
            text={`${booking.durationMinutes} min`}
          />
        </div>
      </div>

      {/* Client card */}
      <p
        className="px-1"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
      >
        CLIENTE
      </p>
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-brand-surface)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--color-text-brand)' }}>
              {initials(booking.customerName)}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
            {booking.customerName}
          </p>
        </div>

        <div className="flex items-center gap-2.5 mb-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
            <path d="M2 2.5C2 2.5 3.5 1 5 1.5c.5.2 1.5 2 1.5 2s.3 1-.7 1.5c-.7.4-.3.8 0 1.2C6.7 7.5 7.5 8.2 8.5 9c.4.3.8.7 1.2 0 .5-1 1.5-.7 1.5-.7s1.8 1 2 1.5c.5 1.5-1 3-1 3s-7 1-10-8Z" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)' }}>
            {booking.customerPhone}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mb-4">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
            <rect x="1" y="3" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 4l6 4.5L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)' }}>
            {booking.customerEmail}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={`tel:${booking.customerPhone.replace(/\s+/g, '')}`}
            className="flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-brand)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1h3l1.5 3.5L4 6s1.5 3 4 4l1.5-1.5L13 10v3s-2.5 1.5-6-1C3.5 9.5 1 4.5 1 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            Contactar
          </a>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(
                `${booking.customerName} · ${booking.customerPhone} · ${booking.customerEmail}`,
              );
            }}
            className="flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="1" width="8" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="5" y="4.5" width="7" height="8.5" rx="1.5" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Copiar datos
          </button>
        </div>
      </div>

      {/* Appointment info */}
      <p
        className="px-1"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
      >
        INFORMACIÓN DE LA CITA
      </p>
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex justify-between items-baseline mb-2 gap-3">
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}>Creada el</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)', textAlign: 'right' }}>
            {format(created, "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })}
          </span>
        </div>
        <div className="flex justify-between items-baseline mb-2 gap-3">
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}>Origen</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)', textAlign: 'right' }}>
            Reserva desde enlace público
          </span>
        </div>
        <div className="flex justify-between items-baseline gap-3">
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}>Observaciones</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)', textAlign: 'right' }}>
            Sin observaciones
          </span>
        </div>

        <div
          className="flex items-start gap-2.5 mt-3 p-3 rounded-xl"
          style={{ backgroundColor: 'var(--color-surface-soft)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: '1px' }}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Las citas pueden modificarse o cancelarse con mínimo {booking.cancellationPolicyHours} horas de anticipación.
          </p>
        </div>
      </div>
    </>
  );

  const footer =
    booking.status === 'CONFIRMED' ? (
      <div
        className={`flex gap-3 p-4 shrink-0${presentation === 'modal' ? ' sm:justify-end' : ''}`}
        style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <button
          onClick={() => onReschedule(booking)}
          className="shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold"
          style={{
            fontFamily: 'var(--font-body)',
            background: 'none',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Reprogramar
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className={`${presentation === 'modal' ? 'flex-1 sm:flex-none sm:px-6' : 'flex-1'} py-3 rounded-2xl text-sm font-semibold`}
          style={{
            fontFamily: 'var(--font-body)',
            backgroundColor: 'var(--color-brand-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Marcar como completada
        </button>
      </div>
    ) : null;

  const confirmDialog = showConfirm ? (
    <ConfirmCompleteDialog
      booking={booking}
      pending={completePending}
      onConfirm={() => onComplete(booking.id)}
      onCancel={() => setShowConfirm(false)}
    />
  ) : null;

  if (presentation === 'modal') {
    return (
      <>
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--overlay-scrim)' }}
          onClick={onClose}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de la cita"
            className="w-full max-w-[520px] lg:max-w-[600px] rounded-3xl flex flex-col overflow-hidden"
            style={{
              maxHeight: '88vh',
              backgroundColor: 'var(--color-surface-soft)',
              boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <div className="flex flex-col gap-1.5">
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--color-text-primary)' }}>
                  Detalle de la cita
                </h2>
                <span className="self-start">{statusBadge}</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
                style={{ backgroundColor: 'var(--color-surface-soft)', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                aria-label="Cerrar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-5">{body}</div>

            {/* Footer */}
            {footer}
          </div>
        </div>

        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <div
        className="hidden lg:block fixed inset-0 z-[90]"
        style={{ backgroundColor: 'rgba(15,23,42,0.3)' }}
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la cita"
        className="fixed inset-0 z-[100] flex flex-col lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[420px]"
        style={{ backgroundColor: 'var(--color-surface-soft)', boxShadow: '-8px 0 40px rgba(15,23,42,0.14)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', padding: '2px' }}
            aria-label="Volver"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5 flex-1">
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)' }}>
              Detalle de la cita
            </h2>
            {statusBadge}
          </div>
          <button
            onClick={onClose}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-full shrink-0"
            style={{ background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-5">{body}</div>

        {/* Footer */}
        {footer}
      </div>

      {confirmDialog}
    </>
  );
}
