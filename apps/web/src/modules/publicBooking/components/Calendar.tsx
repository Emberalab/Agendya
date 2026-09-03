import {
  addMonths,
  format,
  getDaysInMonth,
  isBefore,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a `YYYY-MM-DD` string as a local date (no UTC shift). */
function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

interface CalendarProps {
  /** Selected date as `YYYY-MM-DD`, or '' when nothing is picked. */
  value: string;
  /** Earliest selectable date as `YYYY-MM-DD`. */
  min: string;
  onChange: (dateStr: string) => void;
}

export function Calendar({ value, min, onChange }: CalendarProps) {
  const minDate = parseLocalDate(min);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(value ? parseLocalDate(value) : minDate),
  );

  const daysInMonth = getDaysInMonth(viewMonth);
  const firstOfMonth = startOfMonth(viewMonth);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first grid
  const canGoBack = isBefore(startOfMonth(minDate), viewMonth);

  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1),
    ),
  ];

  const monthLabel = format(viewMonth, 'LLLL yyyy', { locale: es });

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <NavButton
          label="Mes anterior"
          disabled={!canGoBack}
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
        >
          ‹
        </NavButton>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '15px',
            color: 'var(--color-text-primary)',
            textTransform: 'capitalize',
          }}
        >
          {monthLabel}
        </span>
        <NavButton
          label="Mes siguiente"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
        >
          ›
        </NavButton>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday, i) => (
          <span
            key={i}
            className="flex h-8 items-center justify-center"
            style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
          >
            {weekday}
          </span>
        ))}
        {cells.map((cellDate, i) => {
          if (!cellDate) {
            return <span key={`blank-${i}`} className="h-9" />;
          }
          const dateStr = toDateStr(cellDate);
          const disabled = dateStr < min;
          const selected = dateStr === value;
          const isToday = dateStr === min;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onChange(dateStr)}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                fontSize: '14px',
                fontWeight: selected ? 700 : 500,
                color: selected
                  ? '#fff'
                  : disabled
                    ? 'var(--color-text-muted)'
                    : 'var(--color-text-primary)',
                backgroundColor: selected
                  ? 'var(--color-brand-primary)'
                  : 'transparent',
                border:
                  !selected && isToday
                    ? '1px solid var(--color-brand-primary)'
                    : '1px solid transparent',
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {cellDate.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg"
      style={{
        fontSize: '16px',
        color: disabled
          ? 'var(--color-text-muted)'
          : 'var(--color-text-primary)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
