import { useMemo, useState } from 'react';
import type { AgendaBooking, BookingStatus } from '@agendya/types';
import { addDays, endOfMonth, endOfWeek, format, isToday, isTomorrow, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, FormGroup, Input, Select } from '@moondesignsystem/react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { CalendarGridView } from './CalendarGridView';
import { RescheduleModal } from './RescheduleModal';
import { StatusBadge } from './statusBadge';
import { useAgenda } from './hooks/useAgenda';
import { useCancelBooking } from './hooks/useCancelBooking';
import { useRescheduleBooking } from './hooks/useRescheduleBooking';

type ViewMode = 'list' | 'calendar';
type StatusFilter = 'all' | BookingStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'NO_SHOW', label: 'No asistieron' },
];

function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function StatCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </p>
        {icon}
      </div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '32px',
          color: 'var(--color-text-primary)',
          lineHeight: '32px',
          marginBottom: '4px',
        }}
      >
        {value}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{sub}</p>
    </div>
  );
}

function KpiChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 shrink-0 rounded-full px-4 py-2"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontWeight: 600,
        border: `1px solid ${active ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
        backgroundColor: active ? 'var(--color-brand-primary)' : 'var(--color-surface)',
        color: active ? '#fff' : 'var(--color-text-primary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span
        className="inline-flex items-center justify-center rounded-full"
        style={{
          minWidth: '20px',
          height: '20px',
          padding: '0 6px',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 700,
          backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-soft)',
          color: active ? '#fff' : 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
    </button>
  );
}

function StatusChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-2"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontWeight: 600,
        border: `1.5px solid ${active ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
        backgroundColor: active ? '#EEF2FF' : 'var(--color-surface)',
        color: active ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function AppointmentRow({
  booking,
  onModify,
  onCancel,
  cancelPending,
}: {
  booking: AgendaBooking;
  onModify: (booking: AgendaBooking) => void;
  onCancel: (id: string) => void;
  cancelPending: boolean;
}) {
  const bookingDate = new Date(booking.startAt);
  const hoursUntilBooking = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const canModify = !(hoursUntilBooking < booking.cancellationPolicyHours);
  const reason = canModify
    ? undefined
    : `Debes modificar con al menos ${booking.cancellationPolicyHours} horas de anticipación`;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-3.5" style={{ minHeight: '60px' }}>
      <div className="shrink-0 w-28">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {format(bookingDate, 'HH:mm')}–{format(new Date(booking.endAt), 'HH:mm')}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {booking.durationMinutes} min
        </p>
      </div>

      <div className="shrink-0 w-36">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {booking.serviceName}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {booking.customerName}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {booking.customerPhone}
        </p>
      </div>

      <div className="shrink-0 w-32 flex justify-center">
        <StatusBadge status={booking.status} />
      </div>

      {booking.status === 'CONFIRMED' && (
        <div className="flex flex-col items-end gap-1 shrink-0">
          {reason && (
            <p className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
              {reason}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onModify(booking)}
              disabled={!canModify}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                color: canModify ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: canModify ? 'pointer' : 'not-allowed',
                padding: 0,
              }}
            >
              Modificar
            </button>
            <button
              onClick={() => onCancel(booking.id)}
              disabled={!canModify || cancelPending}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
                color: canModify ? '#EF4444' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: canModify ? 'pointer' : 'not-allowed',
                padding: 0,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCardMobile({
  booking,
  onModify,
  onCancel,
  cancelPending,
}: {
  booking: AgendaBooking;
  onModify: (booking: AgendaBooking) => void;
  onCancel: (id: string) => void;
  cancelPending: boolean;
}) {
  const bookingDate = new Date(booking.startAt);
  const hoursUntilBooking = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const canModify = !(hoursUntilBooking < booking.cancellationPolicyHours);
  const reason = canModify
    ? undefined
    : `Debes modificar con al menos ${booking.cancellationPolicyHours} horas de anticipación`;

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          {format(bookingDate, 'HH:mm')}–{format(new Date(booking.endAt), 'HH:mm')} ({booking.durationMinutes} min)
        </p>
        <StatusBadge status={booking.status} />
      </div>

      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
        {booking.serviceName}
      </p>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        {booking.customerName} · {booking.customerPhone}
      </p>

      {booking.status === 'CONFIRMED' && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          {reason && (
            <p className="mb-1.5" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
              {reason}
            </p>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onModify(booking)}
              disabled={!canModify}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 600,
                color: canModify ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: canModify ? 'pointer' : 'not-allowed',
                padding: 0,
              }}
            >
              Modificar
            </button>
            <button
              onClick={() => onCancel(booking.id)}
              disabled={!canModify || cancelPending}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 600,
                color: canModify ? '#EF4444' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: canModify ? 'pointer' : 'not-allowed',
                padding: 0,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AgendaPage() {
  const today = toDateOnly(new Date());
  const inAWeek = toDateOnly(addDays(new Date(), 7));

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(inAWeek);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedBooking, setSelectedBooking] = useState<AgendaBooking | null>(null);

  const { data: bookings, isLoading } = useAgenda(from, to);
  const cancelBooking = useCancelBooking();
  const rescheduleBooking = useRescheduleBooking();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: todayBookings } = useAgenda(today, today);
  const { data: weekBookings } = useAgenda(toDateOnly(weekStart), toDateOnly(weekEnd));
  const { data: monthBookings } = useAgenda(toDateOnly(monthStart), toDateOnly(monthEnd));
  const completedThisMonth = monthBookings?.filter((b) => b.status === 'COMPLETED').length ?? 0;

  const handleReschedule = (newStartAt: string) => {
    if (!selectedBooking) return;
    rescheduleBooking.mutate(
      { id: selectedBooking.id, input: { newStartAt } },
      { onSuccess: () => setSelectedBooking(null) },
    );
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setFrom(today);
    setTo(inAWeek);
  };

  const weekStartStr = toDateOnly(weekStart);
  const weekEndStr = toDateOnly(weekEnd);
  const monthStartStr = toDateOnly(monthStart);
  const monthEndStr = toDateOnly(monthEnd);

  const isHoyChipActive = from === today && to === today;
  const isWeekChipActive = from === weekStartStr && to === weekEndStr;
  const isCompletedChipActive = statusFilter === 'COMPLETED' && from === monthStartStr && to === monthEndStr;

  const handleHoyChip = () => {
    setFrom(today);
    setTo(today);
    setStatusFilter('all');
  };
  const handleWeekChip = () => {
    setFrom(weekStartStr);
    setTo(weekEndStr);
    setStatusFilter('all');
  };
  const handleCompletedChip = () => {
    setFrom(monthStartStr);
    setTo(monthEndStr);
    setStatusFilter('COMPLETED');
  };

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (bookings ?? []).filter((booking) => {
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      const matchesSearch =
        !q ||
        booking.customerName.toLowerCase().includes(q) ||
        booking.customerPhone.toLowerCase().includes(q) ||
        booking.serviceName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  const dayGroups = useMemo(() => {
    const sorted = [...filteredBookings].sort((a, b) => a.startAt.localeCompare(b.startAt));
    const map = new Map<string, AgendaBooking[]>();
    for (const booking of sorted) {
      const key = format(new Date(booking.startAt), 'yyyy-MM-dd');
      const group = map.get(key);
      if (group) group.push(booking);
      else map.set(key, [booking]);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const date = new Date(`${key}T00:00:00`);
      const weekdayDate = format(date, "EEEE d 'de' MMMM", { locale: es }).toUpperCase();
      const suffix = `${items.length} ${items.length === 1 ? 'CITA' : 'CITAS'}`;
      const prefix = isToday(date) ? 'HOY · ' : isTomorrow(date) ? 'MAÑANA · ' : '';
      return { key, label: `${prefix}${weekdayDate} · ${suffix}`, bookings: items };
    });
  }, [filteredBookings]);

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mb-6">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '26px',
            color: 'var(--color-text-primary)',
            marginBottom: '4px',
          }}
        >
          Tu agenda
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Consulta y gestiona tus próximas citas.
        </p>
      </div>

      <div className="chip-scroll flex lg:hidden gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <KpiChip label="Hoy" value={todayBookings?.length ?? 0} active={isHoyChipActive} onClick={handleHoyChip} />
        <KpiChip label="Semana" value={weekBookings?.length ?? 0} active={isWeekChipActive} onClick={handleWeekChip} />
        <KpiChip label="Completadas" value={completedThisMonth} active={isCompletedChipActive} onClick={handleCompletedChip} />
      </div>

      <div className="hidden lg:grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Citas hoy"
          value={todayBookings?.length ?? 0}
          sub={format(now, 'EEE, d MMM', { locale: es }).replace('.', '')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-secondary)' }}>
              <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Esta semana"
          value={weekBookings?.length ?? 0}
          sub="citas programadas"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-secondary)' }}>
              <path d="M2 12l4-4 3 3 5-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Completadas"
          value={completedThisMonth}
          sub="este mes"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-secondary)' }}>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      <div className="rounded-2xl p-4 mb-1" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <FormGroup>
              <FormGroup.Label className="agendia-label">Buscar</FormGroup.Label>
              <Input
                type="search"
                placeholder="Nombre, teléfono o servicio"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                size="md"
                variant="outline"
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
              />
            </FormGroup>
          </div>

          <div className="hidden lg:block shrink-0">
            <FormGroup>
              <FormGroup.Label className="agendia-label">Desde</FormGroup.Label>
              <Input
                type="date"
                value={from}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
                size="md"
                variant="outline"
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
              />
            </FormGroup>
          </div>

          <div className="hidden lg:block shrink-0">
            <FormGroup>
              <FormGroup.Label className="agendia-label">Hasta</FormGroup.Label>
              <Input
                type="date"
                value={to}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
                size="md"
                variant="outline"
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
              />
            </FormGroup>
          </div>

          <div className="hidden lg:block shrink-0" style={{ minWidth: '160px' }}>
            <FormGroup>
              <FormGroup.Label className="agendia-label">Estado</FormGroup.Label>
              <div style={{ position: 'relative' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                >
                  <path
                    d="M6.76594 13.6843C6.70081 13.5789 6.66635 13.4574 6.66641 13.3335V9.33346C6.66626 9.00304 6.54342 8.68445 6.32171 8.43945L1.50458 3.11335C1.41819 3.01764 1.3614 2.89893 1.34111 2.77161C1.32082 2.64428 1.33788 2.51381 1.39023 2.39598C1.44259 2.27816 1.52799 2.17804 1.63609 2.10776C1.74419 2.03748 1.87035 2.00005 1.99929 2H14.0004C14.1293 2.0003 14.2553 2.03792 14.3631 2.1083C14.471 2.17868 14.5562 2.27882 14.6084 2.39659C14.6606 2.51436 14.6776 2.64473 14.6572 2.77194C14.6369 2.89914 14.5801 3.01772 14.4938 3.11335L9.67803 8.43945C9.45632 8.68445 9.33348 9.00304 9.33333 9.33346V14.0002C9.33338 14.1139 9.30438 14.2256 9.24907 14.3249C9.19376 14.4242 9.11398 14.5077 9.01732 14.5675C8.92065 14.6273 8.81031 14.6614 8.69676 14.6665C8.58322 14.6717 8.47024 14.6477 8.36857 14.5969L7.03511 13.9302C6.92428 13.8748 6.83107 13.7897 6.76594 13.6843Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <Select
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as StatusFilter)}
                  size="md"
                  variant="outline"
                  style={{ paddingLeft: '36px', paddingRight: '12px' }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <Select.Option key={o.value} value={o.value}>
                      {o.label}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </FormGroup>
          </div>

          <button
            onClick={handleClearFilters}
            className="px-4 rounded-lg text-sm font-medium shrink-0"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              background: 'none',
              cursor: 'pointer',
              height: '40px',
            }}
          >
            Limpiar
          </button>

          <div className="flex gap-2 shrink-0">
            <Button
              variant={viewMode === 'list' ? 'fill' : 'outline'}
              context="brand"
              size="md"
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'fill' : 'outline'}
              context="brand"
              size="md"
              onClick={() => setViewMode('calendar')}
            >
              Calendario
            </Button>
          </div>
        </div>

        <div className="chip-scroll flex lg:hidden gap-2 mt-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {STATUS_OPTIONS.map((o) => (
            <StatusChip key={o.value} label={o.label} active={statusFilter === o.value} onClick={() => setStatusFilter(o.value)} />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--color-brand-primary)' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Mostrando <strong style={{ color: 'var(--color-text-primary)' }}>{filteredBookings.length} citas</strong> encontradas
          </p>
        </div>
      </div>

      {(cancelBooking.isError || rescheduleBooking.isError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-4">
          <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-body)' }}>
            {getApiErrorMessage(cancelBooking.error || rescheduleBooking.error)}
          </p>
        </div>
      )}

      <div className="mt-5">
        {isLoading && (
          <div
            className="rounded-2xl flex items-center justify-center py-16"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
              Cargando agenda…
            </p>
          </div>
        )}

        {!isLoading && dayGroups.length === 0 && (
          <div
            className="rounded-2xl flex flex-col items-center py-16"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border)' }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="4" width="18" height="16" rx="2" stroke="#94A3B8" strokeWidth="1.5" />
                <path d="M7 2v4M15 2v4M2 10h18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              No hay citas en este período
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Intenta cambiar los filtros o el rango de fechas.
            </p>
          </div>
        )}

        {!isLoading && viewMode === 'list' && dayGroups.length > 0 && (
          <div className="flex flex-col gap-5">
            {dayGroups.map((group) => (
              <div key={group.key}>
                <p
                  className="mb-2 px-1"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    fontWeight: 500,
                  }}
                >
                  {group.label}
                </p>
                <div className="flex lg:hidden flex-col gap-3">
                  {group.bookings.map((booking) => (
                    <AppointmentCardMobile
                      key={booking.id}
                      booking={booking}
                      onModify={setSelectedBooking}
                      onCancel={(id) => cancelBooking.mutate(id)}
                      cancelPending={cancelBooking.isPending}
                    />
                  ))}
                </div>

                <div className="hidden lg:block rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  {group.bookings.map((booking, i) => (
                    <div key={booking.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                      <AppointmentRow
                        booking={booking}
                        onModify={setSelectedBooking}
                        onCancel={(id) => cancelBooking.mutate(id)}
                        cancelPending={cancelBooking.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && viewMode === 'calendar' && (
          <CalendarGridView bookings={filteredBookings} from={from} to={to} onBookingClick={setSelectedBooking} />
        )}
      </div>

      {selectedBooking && (
        <RescheduleModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onConfirm={handleReschedule}
          isLoading={rescheduleBooking.isPending}
        />
      )}
    </div>
  );
}
