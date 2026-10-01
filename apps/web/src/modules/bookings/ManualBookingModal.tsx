import { formatCop, type CreateManualBookingInput, type Service } from '@agendya/types';
import { useMemo, useState } from 'react';
import { Button, FormGroup, Input, Select, Textarea, Checkbox } from '@moondesignsystem/react';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { useServices } from '../services/hooks/useServices';
import { useProfile } from '../professionals/hooks/useProfile';
import { useWorkingHours } from '../schedules/hooks/useWorkingHours';
import { useExceptions } from '../schedules/hooks/useExceptions';
import { formatMinutes, weekdayOf, zonedDateParts, zonedTimeToUtc } from './zonedTime';

/** Same grid as public booking slots (API `SLOT_GRID_MINUTES` default). */
export const MANUAL_BOOKING_STEP_MINUTES = 15;

const FALLBACK_TIMEZONE = 'America/Bogota';

interface ManualBookingModalProps {
  onClose: () => void;
  onConfirm: (input: CreateManualBookingInput) => void;
  isLoading?: boolean;
  /** Server error to show inside the form (e.g. the slot is already taken). */
  errorMessage?: string | null;
  /** `drawer` slides in from the right (list view); `modal` is centered (calendar view). */
  presentation?: 'drawer' | 'modal';
}

function durationFor(service: Service, atHome: boolean): number {
  return atHome ? (service.homeDurationMinutes ?? service.durationMinutes) : service.durationMinutes;
}

function priceFor(service: Service, atHome: boolean): number {
  return atHome ? (service.homePriceCents ?? service.priceCents) : service.priceCents;
}

export function ManualBookingModal({
  onClose,
  onConfirm,
  isLoading,
  errorMessage,
  presentation = 'drawer',
}: ManualBookingModalProps) {
  const { data: services } = useServices();
  const { data: profile } = useProfile();
  const { data: workingHours } = useWorkingHours();
  const { data: exceptions } = useExceptions();
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);

  const timeZone = profile?.timezone ?? FALLBACK_TIMEZONE;
  const now = zonedDateParts(new Date(), timeZone);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [date, setDate] = useState(now.dateStr);
  const [time, setTime] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [atHome, setAtHome] = useState(false);
  const [customerAddress, setCustomerAddress] = useState('');

  const bookableServices = useMemo(
    () => services?.filter((s) => s.isActive && !s.planLocked) ?? [],
    [services],
  );
  const selected = bookableServices.filter((s) => selectedIds.includes(s.id));
  const homeAvailable = selected.length > 0 && selected.every((s) => s.homeServiceEnabled);
  const effectiveAtHome = atHome && homeAvailable;
  const totalDuration = selected.reduce((sum, s) => sum + durationFor(s, effectiveAtHome), 0);
  const totalPrice = selected.reduce((sum, s) => sum + priceFor(s, effectiveAtHome), 0);

  const timeOptions = useMemo(() => {
    const options: number[] = [];
    for (let m = 0; m < 24 * 60; m += MANUAL_BOOKING_STEP_MINUTES) {
      if (date === now.dateStr && m <= now.minutes) continue;
      options.push(m);
    }
    return options;
  }, [date, now.dateStr, now.minutes]);
  const effectiveTime = time !== null && timeOptions.includes(time) ? time : null;

  const scheduleWarning = useMemo(() => {
    if (effectiveTime === null || totalDuration === 0) return null;
    if (exceptions?.some((e) => e.date === date)) {
      return 'Ese día lo marcaste como cerrado. Puedes crear la cita igual.';
    }
    const weekday = weekdayOf(date);
    const fits = (workingHours ?? []).some(
      (block) =>
        block.dayOfWeek === weekday &&
        effectiveTime >= block.startMinute &&
        effectiveTime + totalDuration <= block.endMinute,
    );
    return fits ? null : 'Esta hora está fuera de tu horario de trabajo. Puedes crear la cita igual.';
  }, [date, effectiveTime, exceptions, totalDuration, workingHours]);

  const toggleService = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canSubmit =
    selected.length > 0 &&
    effectiveTime !== null &&
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 7 &&
    (!effectiveAtHome || customerAddress.trim().length >= 5);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || effectiveTime === null) return;
    onConfirm({
      serviceIds: selected.map((s) => s.id).join(','),
      startAt: zonedTimeToUtc(date, effectiveTime, timeZone).toISOString(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() === '' ? undefined : customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      customerNote: customerNote.trim() === '' ? undefined : customerNote.trim(),
      atHome: effectiveAtHome,
      customerAddress: effectiveAtHome ? customerAddress.trim() : undefined,
    });
  };

  const panelContent = (
    <>
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <h2
          className="flex-1"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)' }}
        >
          Nueva cita manual
        </h2>
        <button
          type="button"
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

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="agendia-label" style={{ marginBottom: '6px' }}>
              Servicios *
            </legend>
            {bookableServices.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                No tienes servicios activos. Activa uno en Servicios para crear citas.
              </p>
            ) : (
              bookableServices.map((service) => {
                const checked = selectedIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      cursor: 'pointer',
                      border: `1px solid ${checked ? 'var(--color-text-brand)' : 'var(--color-border)'}`,
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <Checkbox checked={checked} onChange={() => toggleService(service.id)} aria-label={service.name} />
                    <span className="flex-1" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {service.name}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {durationFor(service, effectiveAtHome)} min · {formatCop(priceFor(service, effectiveAtHome) / 100)}
                    </span>
                  </label>
                );
              })
            )}
            {selected.length > 1 && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Total: {totalDuration} min · {formatCop(totalPrice / 100)}
              </p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormGroup.Label htmlFor="manual-date" className="agendia-label">
                Fecha *
              </FormGroup.Label>
              <Input
                id="manual-date"
                type="date"
                value={date}
                min={now.dateStr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                size="md"
                variant="outline"
                required
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
              />
            </FormGroup>
            <FormGroup>
              <FormGroup.Label htmlFor="manual-time" className="agendia-label">
                Hora *
              </FormGroup.Label>
              <Select
                id="manual-time"
                value={effectiveTime === null ? '' : String(effectiveTime)}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setTime(e.target.value === '' ? null : Number(e.target.value))
                }
                size="md"
                variant="outline"
                required
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
              >
                <Select.Option value="">Selecciona</Select.Option>
                {timeOptions.map((m) => (
                  <Select.Option key={m} value={String(m)}>
                    {formatMinutes(m)}
                  </Select.Option>
                ))}
              </Select>
            </FormGroup>
          </div>

          {scheduleWarning && (
            <p
              role="status"
              className="px-3 py-2 rounded-xl"
              style={{ fontSize: '13px', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-warning-surface)', border: '1px solid var(--color-warning-border)' }}
            >
              {scheduleWarning}
            </p>
          )}

          <FormGroup>
            <FormGroup.Label htmlFor="customerName" className="agendia-label">
              Nombre del cliente *
            </FormGroup.Label>
            <Input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
              placeholder="Ej: María González"
              minLength={2}
              maxLength={100}
              size="md"
              variant="outline"
              required
              style={{ paddingLeft: '12px', paddingRight: '12px' }}
            />
          </FormGroup>

          <FormGroup>
            <FormGroup.Label htmlFor="customerPhone" className="agendia-label">
              Teléfono del cliente *
            </FormGroup.Label>
            <Input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
              placeholder="Ej: +57 300 123 4567"
              pattern="[0-9+\-\s()]{7,20}"
              size="md"
              variant="outline"
              required
              style={{ paddingLeft: '12px', paddingRight: '12px' }}
            />
          </FormGroup>

          <FormGroup>
            <FormGroup.Label htmlFor="customerEmail" className="agendia-label">
              Correo del cliente (opcional)
            </FormGroup.Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              size="md"
              variant="outline"
              style={{ paddingLeft: '12px', paddingRight: '12px' }}
            />
            <FormGroup.Hint style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Si lo agregas, le enviaremos la confirmación y los recordatorios.
            </FormGroup.Hint>
          </FormGroup>

          <FormGroup>
            <FormGroup.Label htmlFor="customerNote" className="agendia-label">
              Nota adicional (opcional)
            </FormGroup.Label>
            <Textarea
              id="customerNote"
              value={customerNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomerNote(e.target.value)}
              placeholder="Cualquier información adicional..."
              maxLength={500}
              size="md"
              variant="outline"
              style={{ paddingLeft: '12px', paddingRight: '12px', resize: 'vertical' }}
            />
          </FormGroup>

          {homeAvailable && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="atHome"
                checked={atHome}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAtHome(e.target.checked)}
              />
              <label
                htmlFor="atHome"
                style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}
              >
                Servicio a domicilio
              </label>
            </div>
          )}

          {effectiveAtHome && (
            <FormGroup>
              <FormGroup.Label htmlFor="customerAddress" className="agendia-label">
                Dirección del cliente *
              </FormGroup.Label>
              <Input
                id="customerAddress"
                type="text"
                value={customerAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerAddress(e.target.value)}
                placeholder="Calle 123 #45-67, Bogotá"
                minLength={5}
                maxLength={200}
                size="md"
                variant="outline"
                required
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
              />
            </FormGroup>
          )}

          {errorMessage && (
            <p role="alert" style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
              {errorMessage}
            </p>
          )}
        </div>

        <div
          className="flex gap-3 p-4 shrink-0"
          style={{
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <Button type="button" variant="outline" size="md" isFullWidth onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="fill" context="brand" size="md" isFullWidth disabled={isLoading || !canSubmit}>
            {isLoading ? 'Creando...' : 'Crear cita'}
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
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Nueva cita manual"
          className="w-full max-w-[480px] rounded-3xl flex flex-col overflow-hidden"
          style={{ maxHeight: '88vh', backgroundColor: 'var(--color-surface-soft)', boxShadow: 'var(--shadow-dialog)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {panelContent}
        </div>
      </div>
    );
  }

  // Above the dashboard's mobile bottom nav (z-index 50), which otherwise
  // covers the footer with the submit button.
  return (
    <>
      <div className="fixed inset-0 z-[90]" style={{ backgroundColor: 'var(--overlay-scrim)' }} onClick={onClose} />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Nueva cita manual"
        className="fixed top-0 right-0 bottom-0 z-[100] flex flex-col w-full"
        style={{
          maxWidth: '440px',
          backgroundColor: 'var(--color-surface-soft)',
          boxShadow: 'var(--shadow-drawer)',
        }}
      >
        {panelContent}
      </div>
    </>
  );
}
