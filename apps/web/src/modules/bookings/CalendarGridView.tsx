import { useMemo, useState } from 'react';
import type { AgendaBooking } from '@agendya/types';
import { format } from 'date-fns';
import { STATUS_CFG } from './statusConfig';

interface CalendarGridViewProps {
  bookings: AgendaBooking[];
  initialMonth: string;
  onBookingClick: (booking: AgendaBooking) => void;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_NAMES_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

type Cell = { day: number; month: number; year: number; isCurrentMonth: boolean; dateKey: string };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function buildCalCells(year: number, month: number): Cell[] {
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: Cell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({ day: d, month: prevMonth, year: prevYear, isCurrentMonth: false, dateKey: `${prevYear}-${pad(prevMonth)}-${pad(d)}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true, dateKey: `${year}-${pad(month)}-${pad(d)}` });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ day: nextDay, month: nextMonth, year: nextYear, isCurrentMonth: false, dateKey: `${nextYear}-${pad(nextMonth)}-${pad(nextDay)}` });
    nextDay++;
  }
  return cells;
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES_ES[date.getDay()];
  return `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)}, ${d} de ${MONTH_NAMES_LONG[m - 1]}`;
}

function DaySidebar({
  dateKey,
  bookings,
  onClose,
  onSelect,
}: {
  dateKey: string;
  bookings: AgendaBooking[];
  onClose: () => void;
  onSelect: (b: AgendaBooking) => void;
}) {
  const inner = (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Agenda del día
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
            {formatDayLabel(dateKey)}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-brand-primary)', fontWeight: 500 }}>
            {bookings.length} {bookings.length === 1 ? 'cita programada' : 'citas programadas'}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted)' }}
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 3l12 12M15 3 3 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ height: 1, backgroundColor: 'var(--color-border)' }} />

      <div className="flex flex-col gap-3 overflow-y-auto flex-1">
        {bookings.map((b) => {
          const cfg = STATUS_CFG[b.status];
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              className="w-full text-left rounded-xl p-3.5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-brand-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: 'var(--color-brand-primary)' }}>
                  {format(new Date(b.startAt), 'HH:mm')}–{format(new Date(b.endAt), 'HH:mm')}
                </p>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: 99,
                    backgroundColor: cfg.bg,
                    color: cfg.color,
                    border: `1px solid ${cfg.border}`,
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cfg.label}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: 2 }}>
                {b.serviceName}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                {b.customerName}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>{b.customerPhone}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[80]" style={{ backgroundColor: 'rgba(15,23,42,0.35)' }} onClick={onClose} />
      <div
        className="fixed z-[90] inset-x-0 bottom-0 max-h-[85vh] rounded-t-[20px] lg:inset-y-0 lg:inset-x-auto lg:left-auto lg:right-0 lg:w-80 lg:max-h-none lg:rounded-none"
        style={{ backgroundColor: 'var(--color-surface-soft)', overflowY: 'auto', borderLeft: '1px solid var(--color-border)' }}
      >
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 99, backgroundColor: 'var(--color-border)' }} />
        </div>
        <div className="px-5 pb-12 pt-3 lg:px-6 lg:py-7 h-full">{inner}</div>
      </div>
    </>
  );
}

export function CalendarGridView({ bookings, initialMonth, onBookingClick }: CalendarGridViewProps) {
  const seed = useMemo(() => {
    const parsed = new Date(`${initialMonth}T00:00:00`);
    const d = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [initialMonth]);

  const [year, setYear] = useState(seed.year);
  const [month, setMonth] = useState(seed.month);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaBooking[]>();
    for (const b of bookings) {
      const key = format(new Date(b.startAt), 'yyyy-MM-dd');
      const group = map.get(key);
      if (group) group.push(b);
      else map.set(key, [b]);
    }
    for (const group of map.values()) group.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [bookings]);

  const cells = useMemo(() => buildCalCells(year, month), [year, month]);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const goPrev = () => {
    setSelectedDay(null);
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    setSelectedDay(null);
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const navButtons = (
    <div className="flex gap-2">
      {[
        { fn: goPrev, d: 'M9 3L3 9l6 6', label: 'Mes anterior' },
        { fn: goNext, d: 'M5 3l6 6-6 6', label: 'Mes siguiente' },
      ].map((btn) => (
        <button
          key={btn.label}
          onClick={btn.fn}
          aria-label={btn.label}
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-soft)',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={btn.d} stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop calendar */}
      <div
        className="hidden lg:block rounded-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 20 }}
      >
        <div className="flex items-center justify-between" style={{ paddingBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--color-text-primary)' }}>
            {MONTHS_ES[month - 1]} {year}
          </p>
          {navButtons}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                padding: '10px 0',
                borderRadius: 8,
                backgroundColor: 'var(--color-surface-soft)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {cells.map((cell) => {
            const dayBookings = byDate.get(cell.dateKey) ?? [];
            const hasBookings = dayBookings.length > 0;
            const isSelected = selectedDay === cell.dateKey;
            return (
              <div
                key={cell.dateKey}
                onClick={() => hasBookings && setSelectedDay(isSelected ? null : cell.dateKey)}
                style={{
                  minHeight: 112,
                  borderRadius: 12,
                  border: `1px solid ${isSelected ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
                  padding: 10,
                  overflow: 'hidden',
                  cursor: hasBookings ? 'pointer' : 'default',
                  opacity: cell.isCurrentMonth ? 1 : 0.5,
                  backgroundColor: isSelected
                    ? 'var(--color-brand-primary)'
                    : cell.isCurrentMonth
                      ? 'var(--color-surface-soft)'
                      : 'var(--color-surface)',
                  position: 'relative',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (hasBookings && !isSelected)
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-brand-primary)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: cell.dateKey === todayKey ? 700 : 600,
                    fontSize: '13px',
                    lineHeight: '18px',
                    marginBottom: hasBookings ? 6 : 0,
                    color: isSelected ? '#fff' : cell.isCurrentMonth ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  {cell.day}
                </p>
                {hasBookings && (
                  <>
                    <div className="flex flex-col gap-1">
                      {dayBookings.slice(0, 2).map((b) => (
                        <p
                          key={b.id}
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 600,
                            fontSize: '10px',
                            lineHeight: '14px',
                            color: isSelected ? '#fff' : 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {format(new Date(b.startAt), 'HH:mm')} {b.customerName.split(' ')[0]}
                        </p>
                      ))}
                      {dayBookings.length > 2 && (
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 700,
                            fontSize: '9px',
                            color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)',
                          }}
                        >
                          +{dayBookings.length - 2} más
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 9,
                        right: 9,
                        backgroundColor: isSelected ? '#fff' : '#EDF2FF',
                        borderRadius: 6,
                        padding: '2px 6px',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontWeight: 600,
                          fontSize: '11px',
                          color: 'var(--color-brand-primary)',
                          lineHeight: '14px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dayBookings.length} {dayBookings.length === 1 ? 'cita' : 'citas'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile calendar */}
      <div
        className="lg:hidden rounded-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 14 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)' }}>
            {MONTHS_ES[month - 1]} {year}
          </p>
          {navButtons}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                padding: '6px 0',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((cell) => {
            const dayBookings = byDate.get(cell.dateKey) ?? [];
            const hasBookings = dayBookings.length > 0;
            const isSelected = selectedDay === cell.dateKey;
            return (
              <div
                key={cell.dateKey}
                onClick={() => hasBookings && setSelectedDay(isSelected ? null : cell.dateKey)}
                className="flex flex-col items-center justify-center"
                style={{
                  aspectRatio: '1',
                  borderRadius: 8,
                  cursor: hasBookings ? 'pointer' : 'default',
                  opacity: cell.isCurrentMonth ? 1 : 0.4,
                  backgroundColor: isSelected ? 'var(--color-brand-primary)' : 'transparent',
                  position: 'relative',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: isSelected ? '#fff' : cell.isCurrentMonth ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  {cell.day}
                </p>
                {hasBookings && !isSelected && (
                  <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--color-brand-primary)', marginTop: 2 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && byDate.get(selectedDay) && (
        <DaySidebar
          dateKey={selectedDay}
          bookings={byDate.get(selectedDay)!}
          onClose={() => setSelectedDay(null)}
          onSelect={onBookingClick}
        />
      )}
    </>
  );
}
