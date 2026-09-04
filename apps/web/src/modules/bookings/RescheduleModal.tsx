import type { AgendaBooking } from '@agendya/types';
import { useState } from 'react';
import { Button, FormGroup, Input } from '@moondesignsystem/react';
import { useProfile } from '../professionals/hooks/useProfile';
import { useAvailability } from '../publicBooking/hooks/useAvailability';
import { SlotGrid } from '../publicBooking/components/SlotGrid';
import { StatusBadge } from './statusBadge';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

interface RescheduleModalProps {
  booking: AgendaBooking;
  onClose: () => void;
  onConfirm: (newStartAt: string) => void;
  isLoading?: boolean;
  /** `drawer` slides in from the right (list view); `modal` is centered (calendar view). */
  presentation?: 'drawer' | 'modal';
}

export function RescheduleModal({
  booking,
  onClose,
  onConfirm,
  isLoading,
  presentation = 'drawer',
}: RescheduleModalProps) {
  const currentDate = new Date(booking.startAt);
  const [newDate, setNewDate] = useState(currentDate.toISOString().slice(0, 10));
  const [newSlot, setNewSlot] = useState<string | null>(null);

  const { data: profile } = useProfile();

  const availability = useAvailability(
    profile?.slug ?? '',
    booking.serviceId ? [booking.serviceId] : [],
    newDate,
  );

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newSlot) {
      onConfirm(newSlot);
    }
  };

  const panelContent = (
    <>
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-2.5 flex-1">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)' }}>
            Modificar fecha y hora
          </h2>
          <StatusBadge status={booking.status} />
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
          style={{ background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)' }}
          aria-label="Cerrar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--color-text-primary)' }}>
                {booking.serviceName}
              </h3>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                {booking.durationMinutes} min
              </span>
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M4.5 1v2.5M9.5 1v2.5M1 5.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {currentDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 4v3.2l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {currentDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                {' – '}
                {new Date(booking.endAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div>
            <p
              className="px-1 mb-2"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
            >
              CLIENTE
            </p>
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#EEF2FF' }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--color-brand-primary)' }}>
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

              <div className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  <rect x="1" y="3" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1 4l6 4.5L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {booking.customerEmail}
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: '1px' }}>
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
              Las citas pueden modificarse o cancelarse con mínimo {booking.cancellationPolicyHours} horas de anticipación.
            </p>
          </div>

          <FormGroup>
            <FormGroup.Label htmlFor="newDate" className="agendia-label">
              Nueva fecha *
            </FormGroup.Label>
            <Input
              id="newDate"
              type="date"
              value={newDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setNewDate(e.target.value);
                setNewSlot(null);
              }}
              min={new Date().toISOString().slice(0, 10)}
              size="md"
              variant="outline"
              required
              style={{ paddingLeft: '12px', paddingRight: '12px' }}
            />
          </FormGroup>

          {newDate && (
            <div>
              <p
                className="mb-3 font-medium"
                style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-secondary)' }}
              >
                Horarios disponibles
              </p>
              <SlotGrid
                slots={availability.data ?? []}
                isLoading={availability.isLoading}
                selectedSlot={newSlot}
                onSelect={setNewSlot}
              />
            </div>
          )}
        </div>

        <div
          className="flex gap-3 p-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <Button type="button" variant="outline" size="md" isFullWidth onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="fill" context="brand" size="md" isFullWidth disabled={!newSlot || isLoading}>
            {isLoading ? 'Guardando...' : 'Confirmar'}
          </Button>
        </div>
      </form>
    </>
  );

  if (presentation === 'modal') {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--overlay-scrim)' }}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Modificar fecha y hora"
          className="w-full max-w-[480px] lg:max-w-[680px] rounded-3xl flex flex-col overflow-hidden"
          style={{ maxHeight: '88vh', backgroundColor: 'var(--color-surface-soft)', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(15,23,42,0.3)' }} onClick={onClose} />

      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-full"
        style={{
          maxWidth: '440px',
          backgroundColor: 'var(--color-surface-soft)',
          boxShadow: '-8px 0 40px rgba(15,23,42,0.14)',
        }}
      >
        {panelContent}
      </div>
    </>
  );
}
