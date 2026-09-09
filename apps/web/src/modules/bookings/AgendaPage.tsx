import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AgendaBooking, BookingStatus } from '@agendya/types';
import { addDays, endOfMonth, endOfWeek, format, isToday, isTomorrow, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { FormGroup, Input, Select } from '@moondesignsystem/react';
import { AGENDA_FOCUS_BOOKING_PARAM, AGENDA_FOCUS_DATE_PARAM } from '../notifications/navigation';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { AppointmentDrawer } from './AppointmentDrawer';
import { CalendarGridView } from './CalendarGridView';
import { ContextMenu } from './ContextMenu';
import { RescheduleModal } from './RescheduleModal';
import { StatusBadge } from './statusBadge';
import { useAgenda } from './hooks/useAgenda';
import { useCancelBooking } from './hooks/useCancelBooking';
import { useCompleteBooking } from './hooks/useCompleteBooking';
import { useRescheduleBooking } from './hooks/useRescheduleBooking';

type ViewMode = 'list' | 'calendar';
type StatusFilter = 'all' | BookingStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'NO_SHOW', label: 'No asistieron' },
  { value: 'EXPIRED', label: 'Vencidas' },
];

const MOBILE_STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'EXPIRED', label: 'Vencidas' },
];

function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function contactCustomer(phone: string) {
  window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
}

function StatCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between mb-3">
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
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
          lineHeight: 1,
          marginBottom: '4px',
        }}
      >
        {value}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-text-muted)' }}>{sub}</p>
    </div>
  );
}

function MobileStatPill({
  label,
  value,
  filled,
  onClick,
}: {
  label: string;
  value: number;
  filled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-full shrink-0"
      style={{
        backgroundColor: filled ? 'var(--color-brand-primary)' : 'var(--color-surface-soft)',
        border: `1px solid ${filled ? 'transparent' : 'var(--color-border)'}`,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 500,
          color: filled ? '#fff' : 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '13px',
          color: filled ? '#fff' : 'var(--color-text-primary)',
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
      className="shrink-0 rounded-full px-3 py-1.5 text-sm"
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: active ? 600 : 400,
        border: `1px solid ${active ? 'rgba(79,70,229,0.2)' : 'var(--color-border)'}`,
        backgroundColor: active ? 'var(--color-brand-tint)' : 'transparent',
        color: active ? 'var(--color-text-brand)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function RowActions({
  booking,
  onViewDetail,
  onReschedule,
  onCancel,
}: {
  booking: AgendaBooking;
  onViewDetail: (b: AgendaBooking) => void;
  onReschedule: (b: AgendaBooking) => void;
  onCancel: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => onViewDetail(booking)}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-brand)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        Ver detalle
      </button>
      <button
        ref={triggerRef}
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center justify-center w-7 h-7 rounded-lg"
        style={{
          color: 'var(--color-text-muted)',
          background: menuOpen ? 'var(--color-surface-soft)' : 'none',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-label="Acciones"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3" r="1" fill="currentColor" />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
          <circle cx="8" cy="13" r="1" fill="currentColor" />
        </svg>
      </button>
      {menuOpen && (
        <ContextMenu
          anchorRef={triggerRef}
          onClose={() => setMenuOpen(false)}
          onViewDetail={() => onViewDetail(booking)}
          onReschedule={() => onReschedule(booking)}
          onContact={() => contactCustomer(booking.customerPhone)}
          onCancel={() => onCancel(booking.id)}
          canModify={booking.canReschedule}
        />
      )}
    </div>
  );
}

function AppointmentRow({
  booking,
  onViewDetail,
  onReschedule,
  onCancel,
}: {
  booking: AgendaBooking;
  onViewDetail: (b: AgendaBooking) => void;
  onReschedule: (b: AgendaBooking) => void;
  onCancel: (id: string) => void;
}) {
  const start = new Date(booking.startAt);
  return (
    <div className="flex items-center gap-4 px-5 py-3.5" style={{ minHeight: '60px' }}>
      <div className="shrink-0 w-28">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {format(start, 'HH:mm')}–{format(new Date(booking.endAt), 'HH:mm')}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {booking.durationMinutes} min
        </p>
      </div>

      <div className="shrink-0 w-36">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {booking.serviceName}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {booking.customerName}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {booking.customerPhone}
        </p>
      </div>

      <div className="shrink-0 w-32 flex justify-center">
        <StatusBadge status={booking.status} />
      </div>

      <RowActions booking={booking} onViewDetail={onViewDetail} onReschedule={onReschedule} onCancel={onCancel} />
    </div>
  );
}

function AppointmentCardMobile({
  booking,
  onViewDetail,
  onReschedule,
  onCancel,
}: {
  booking: AgendaBooking;
  onViewDetail: (b: AgendaBooking) => void;
  onReschedule: (b: AgendaBooking) => void;
  onCancel: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const start = new Date(booking.startAt);
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {format(start, 'HH:mm')}–{format(new Date(booking.endAt), 'HH:mm')} ({booking.durationMinutes} min)
        </p>
        <StatusBadge status={booking.status} />
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
        {booking.serviceName}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
        {booking.customerName} · {booking.customerPhone}
      </p>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onViewDetail(booking)}
          style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Ver detalle
        </button>
        <button
          ref={triggerRef}
          onClick={() => setMenuOpen((o) => !o)}
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-label="Acciones"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="3" cy="8" r="1" fill="currentColor" />
            <circle cx="8" cy="8" r="1" fill="currentColor" />
            <circle cx="13" cy="8" r="1" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && (
          <ContextMenu
            anchorRef={triggerRef}
            onClose={() => setMenuOpen(false)}
            onViewDetail={() => onViewDetail(booking)}
            onReschedule={() => onReschedule(booking)}
            onContact={() => contactCustomer(booking.customerPhone)}
            onCancel={() => onCancel(booking.id)}
            canModify={booking.canReschedule}
          />
        )}
      </div>
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
  const [selectedForReschedule, setSelectedForReschedule] = useState<AgendaBooking | null>(null);
  const [selectedForDetail, setSelectedForDetail] = useState<AgendaBooking | null>(null);

  const { data: bookings, isLoading } = useAgenda(from, to);

  // Deep link from a notification: ?booking=<id>&date=<yyyy-mm-dd>. Open that
  // booking's detail drawer regardless of the active view (list or calendar).
  const [searchParams, setSearchParams] = useSearchParams();
  const focusBookingId = searchParams.get(AGENDA_FOCUS_BOOKING_PARAM);
  const focusDate = searchParams.get(AGENDA_FOCUS_DATE_PARAM);

  // Widen — never shrink — the range so the target day is fetched. Pad ±1 day
  // to absorb the UTC-vs-professional-timezone date skew in `date`.
  useEffect(() => {
    if (!focusBookingId || !focusDate) return;
    const focus = new Date(`${focusDate}T00:00:00`);
    if (Number.isNaN(focus.getTime())) return;
    const lo = toDateOnly(addDays(focus, -1));
    const hi = toDateOnly(addDays(focus, 1));
    setFrom((prev) => (lo < prev ? lo : prev));
    setTo((prev) => (hi > prev ? hi : prev));
  }, [focusBookingId, focusDate]);

  // Once the widened range covers the target day and has loaded, open the
  // booking and drop the params so a refresh or Back doesn't reopen it.
  const focusInRange = !focusDate || (focusDate >= from && focusDate <= to);
  useEffect(() => {
    if (!focusBookingId || !focusInRange || isLoading) return;
    const match = (bookings ?? []).find((b) => b.id === focusBookingId);
    if (match) setSelectedForDetail(match);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(AGENDA_FOCUS_BOOKING_PARAM);
        next.delete(AGENDA_FOCUS_DATE_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [focusBookingId, focusInRange, isLoading, bookings, setSearchParams]);

  const cancelBooking = useCancelBooking();
  const completeBooking = useCompleteBooking();
  const rescheduleBooking = useRescheduleBooking();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: todayBookings } = useAgenda(today, today);
  const { data: weekBookings } = useAgenda(toDateOnly(weekStart), toDateOnly(weekEnd));
  const { data: monthBookings } = useAgenda(toDateOnly(monthStart), toDateOnly(monthEnd));
  const pendingThisMonth = monthBookings?.filter((b) => b.status === 'PENDING').length ?? 0;
  const completedThisMonth = monthBookings?.filter((b) => b.status === 'COMPLETED').length ?? 0;

  const weekStartStr = toDateOnly(weekStart);
  const weekEndStr = toDateOnly(weekEnd);

  const isHoyActive = from === today && to === today;
  const isWeekActive = from === weekStartStr && to === weekEndStr;
  const isPendingActive = statusFilter === 'PENDING';
  const isCompletedActive = statusFilter === 'COMPLETED';

  const handleReschedule = (newStartAt: string) => {
    if (!selectedForReschedule) return;
    rescheduleBooking.mutate(
      { id: selectedForReschedule.id, input: { newStartAt } },
      { onSuccess: () => setSelectedForReschedule(null) },
    );
  };

  const handleComplete = (id: string) => {
    completeBooking.mutate(id, { onSuccess: () => setSelectedForDetail(null) });
  };

  const openReschedule = (booking: AgendaBooking) => {
    setSelectedForDetail(null);
    setSelectedForReschedule(booking);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setFrom(today);
    setTo(inAWeek);
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

  const mutationError = cancelBooking.error || completeBooking.error || rescheduleBooking.error;

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mb-6">
        <h1
          className="text-[24px] lg:text-[28px]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}
        >
          Tu agenda
        </h1>
        <p className="text-[13px] lg:text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
          Consulta y gestiona tus próximas citas.
        </p>
      </div>

      {/* Mobile stat pills */}
      <div className="chip-scroll flex lg:hidden gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <MobileStatPill
          label="Hoy"
          value={todayBookings?.length ?? 0}
          filled={isHoyActive}
          onClick={() => {
            setFrom(today);
            setTo(today);
            setStatusFilter('all');
          }}
        />
        <MobileStatPill
          label="Semana"
          value={weekBookings?.length ?? 0}
          filled={isWeekActive}
          onClick={() => {
            setFrom(weekStartStr);
            setTo(weekEndStr);
            setStatusFilter('all');
          }}
        />
        <MobileStatPill
          label="Pendientes"
          value={pendingThisMonth}
          filled={isPendingActive}
          onClick={() => setStatusFilter(isPendingActive ? 'all' : 'PENDING')}
        />
        <MobileStatPill
          label="Completadas"
          value={completedThisMonth}
          filled={isCompletedActive}
          onClick={() => setStatusFilter(isCompletedActive ? 'all' : 'COMPLETED')}
        />
      </div>

      {/* Desktop stats */}
      <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Citas hoy"
          value={todayBookings?.length ?? 0}
          sub={format(now, 'EEE, d MMM', { locale: es }).replace('.', '')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-muted)' }}>
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-muted)' }}>
              <path d="M2 12l4-4 3 3 5-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Pendientes"
          value={pendingThisMonth}
          sub="requieren confirmación"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-muted)' }}>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Completadas"
          value={completedThisMonth}
          sub="este mes"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-muted)' }}>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      {/* View toggle */}
      <div className="mb-4 lg:mb-5 flex">
        <div
          className="flex items-center"
          style={{ padding: 4, borderRadius: 12, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {(['list', 'calendar'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: viewMode === id ? 'var(--color-brand-primary)' : 'transparent',
                color: viewMode === id ? '#fff' : 'var(--color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {id === 'list' ? 'Lista' : 'Calendario'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar (list view only) */}
      {viewMode === 'list' && (
        <div className="rounded-2xl p-4 mb-1" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-48 hidden lg:block">
              <FormGroup>
                <FormGroup.Label htmlFor="agenda-search" className="agendia-label">Buscar</FormGroup.Label>
                <Input
                  id="agenda-search"
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

            {/* Mobile search */}
            <div className="w-full lg:hidden">
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <span style={{ color: 'var(--color-text-brand)', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  aria-label="Buscar cita"
                  placeholder="Buscar cita..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'none',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    width: '100%',
                  }}
                />
              </div>
            </div>

            <div className="hidden lg:block shrink-0">
              <FormGroup>
                <FormGroup.Label htmlFor="agenda-from" className="agendia-label">Desde</FormGroup.Label>
                <Input
                  id="agenda-from"
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
                <FormGroup.Label htmlFor="agenda-to" className="agendia-label">Hasta</FormGroup.Label>
                <Input
                  id="agenda-to"
                  type="date"
                  value={to}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
                  size="md"
                  variant="outline"
                  style={{ paddingLeft: '12px', paddingRight: '12px' }}
                />
              </FormGroup>
            </div>

            {/* Estado inline pill */}
            <div
              className="filter-estado-pill hidden lg:flex items-center gap-2 px-3 rounded-lg shrink-0"
              style={{ border: '1px solid var(--color-border)', height: '40px', alignSelf: 'flex-end' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              >
                <path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', userSelect: 'none' }}
              >
                Estado
              </span>
              <Select
                aria-label="Estado"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as StatusFilter)}
                size="sm"
                variant="outline"
                style={{
                  border: 'none',
                  boxShadow: 'none',
                  padding: 0,
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--color-text-primary)',
                  background: 'none',
                  cursor: 'pointer',
                  minWidth: '84px',
                }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <Select.Option key={o.value} value={o.value}>
                    {o.label}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <button
              onClick={handleClearFilters}
              className="hidden lg:block px-4 rounded-lg text-sm font-medium shrink-0"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                background: 'none',
                cursor: 'pointer',
                height: '40px',
                alignSelf: 'flex-end',
              }}
            >
              Limpiar
            </button>
          </div>

          {/* Mobile status chips */}
          <div className="chip-scroll flex lg:hidden gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {MOBILE_STATUS_OPTIONS.map((o) => (
              <StatusChip
                key={o.value}
                label={o.label}
                active={statusFilter === o.value}
                onClick={() => setStatusFilter(o.value)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--color-brand-primary)' }} />
            <p className="text-xs lg:text-[13px]" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
              Mostrando <strong style={{ color: 'var(--color-text-primary)' }}>{filteredBookings.length} citas</strong> encontradas
            </p>
          </div>
        </div>
      )}

      {mutationError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3 mt-4">
          <p className="text-sm text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-body)' }}>
            {getApiErrorMessage(mutationError)}
          </p>
        </div>
      )}

      <div className="mt-5">
        {isLoading && (
          <div
            className="rounded-2xl flex items-center justify-center py-16"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}>Cargando agenda…</p>
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
                      onViewDetail={setSelectedForDetail}
                      onReschedule={openReschedule}
                      onCancel={(id) => cancelBooking.mutate(id)}
                    />
                  ))}
                </div>

                <div
                  className="hidden lg:block rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  {group.bookings.map((booking, i) => (
                    <div key={booking.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                      <AppointmentRow
                        booking={booking}
                        onViewDetail={setSelectedForDetail}
                        onReschedule={openReschedule}
                        onCancel={(id) => cancelBooking.mutate(id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && viewMode === 'calendar' && (
          <CalendarGridView bookings={filteredBookings} initialMonth={from} onBookingClick={setSelectedForDetail} />
        )}
      </div>

      {selectedForDetail && (
        <AppointmentDrawer
          booking={selectedForDetail}
          onClose={() => setSelectedForDetail(null)}
          onReschedule={openReschedule}
          onComplete={handleComplete}
          completePending={completeBooking.isPending}
          presentation={viewMode === 'calendar' ? 'modal' : 'drawer'}
        />
      )}

      {selectedForReschedule && (
        <RescheduleModal
          booking={selectedForReschedule}
          onClose={() => setSelectedForReschedule(null)}
          onConfirm={handleReschedule}
          isLoading={rescheduleBooking.isPending}
          presentation={viewMode === 'calendar' ? 'modal' : 'drawer'}
        />
      )}
    </div>
  );
}
