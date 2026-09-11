import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Weekday, WorkingHour } from '@agendya/types';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import {
  formatRange,
  groupByDay,
  newBlockId,
  serializeBlocks,
  toDaysPayload,
  type Block,
} from './blocks';
import { useSetWorkingHours } from './hooks/useSetWorkingHours';
import { WEEKDAY_LABELS, WEEKDAY_SLUGS, WEEK_ORDER } from './weekday';

/** Default block applied when a rest day is switched on: 09:00–18:00. */
function createDefaultBlock(): Block {
  return { id: newBlockId(), startMinute: 540, endMinute: 1080 };
}

function serialize(byDay: Record<Weekday, Block[]>): string {
  return JSON.stringify(
    WEEK_ORDER.map((day) =>
      byDay[day].map((b) => [b.startMinute, b.endMinute]),
    ),
  );
}

export function WeeklyScheduleTable({ hours }: { hours: WorkingHour[] }) {
  const navigate = useNavigate();
  const setWorkingHours = useSetWorkingHours();

  const serverByDay = useMemo(() => groupByDay(hours), [hours]);
  const [draft, setDraft] = useState<Record<Weekday, Block[]>>(serverByDay);

  useEffect(() => {
    setDraft(serverByDay);
  }, [serverByDay]);

  const dirty = serialize(draft) !== serialize(serverByDay);
  // Per-day flag (vs. the whole-week `dirty` above) so each row can show
  // its own "sin guardar" badge — with several toggled at once, the single
  // bottom-of-page message doesn't say which days it's actually talking
  // about.
  const isDayDirty = (day: Weekday) =>
    serializeBlocks(draft[day]) !== serializeBlocks(serverByDay[day]);

  const toggleDay = (day: Weekday) => {
    setDraft((current) => ({
      ...current,
      [day]: current[day].length > 0 ? [] : [createDefaultBlock()],
    }));
  };

  const handleSave = () => {
    setWorkingHours.mutate({ days: toDaysPayload(draft) });
  };

  const goToDay = (day: Weekday) =>
    navigate(`/dashboard/schedule/${WEEKDAY_SLUGS[day]}`);

  return (
    <div>
      {setWorkingHours.isError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            {getApiErrorMessage(setWorkingHours.error)}
          </p>
        </div>
      )}

      {/* Desktop table */}
      <div
        className="hidden lg:block rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="grid items-center px-6 py-3"
          style={{
            gridTemplateColumns: '180px 70px 1fr 80px',
            backgroundColor: 'var(--color-surface-soft)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {['Día', 'Estado', 'Bloques de trabajo', 'Acciones'].map((h) => (
            <span
              key={h}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {WEEK_ORDER.map((day, i) => {
          const blocks = draft[day];
          const enabled = blocks.length > 0;
          const changed = isDayDirty(day);
          return (
            <div
              key={day}
              className="grid items-center px-6 py-4"
              style={{
                gridTemplateColumns: '180px 70px 1fr 80px',
                borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                backgroundColor: changed
                  ? 'var(--color-brand-surface)'
                  : 'transparent',
              }}
            >
              {/* Stacked (not inline) so the "Sin guardar" badge gets its own
                  line instead of fighting the day name for room in a fixed-
                  width column. */}
              <span className="flex flex-col items-start gap-1">
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {WEEKDAY_LABELS[day]}
                </span>
                {changed && <UnsavedBadge />}
              </span>

              <DayToggle
                enabled={enabled}
                label={`Estado de ${WEEKDAY_LABELS[day]}`}
                onChange={() => toggleDay(day)}
              />

              <BlockPills blocks={blocks} />

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => goToDay(day)}
                  aria-label={`Configurar ${WEEKDAY_LABELS[day]}`}
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <PencilIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile day cards */}
      <div className="flex lg:hidden flex-col gap-3">
        {WEEK_ORDER.map((day) => {
          const blocks = draft[day];
          const enabled = blocks.length > 0;
          const changed = isDayDirty(day);
          return (
            <div
              key={day}
              className="rounded-2xl p-5"
              style={{
                backgroundColor: changed
                  ? 'var(--color-brand-surface)'
                  : 'var(--color-surface)',
                border: `1px solid ${changed ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                {/* flex-wrap: on very narrow phones the badge drops to its
                    own line instead of squeezing against the day name. */}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {WEEKDAY_LABELS[day]}
                  </span>
                  {changed && <UnsavedBadge />}
                </span>
                <DayToggle
                  enabled={enabled}
                  label={`Estado de ${WEEKDAY_LABELS[day]}`}
                  onChange={() => toggleDay(day)}
                />
              </div>

              <div className="mt-3">
                <BlockPills blocks={blocks} />
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => goToDay(day)}
                  aria-label={`Configurar ${WEEKDAY_LABELS[day]}`}
                  className="flex items-center justify-center w-9 h-9 -mr-1.5 -mb-1.5 rounded-lg"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <PencilIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {setWorkingHours.isSuccess && !dirty
            ? 'Cambios guardados.'
            : dirty
              ? 'Tienes cambios sin guardar.'
              : 'Los cambios se aplican de inmediato a tu página de reservas.'}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || setWorkingHours.isPending}
          className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor:
              !dirty || setWorkingHours.isPending
                ? 'var(--color-border)'
                : 'var(--color-brand-primary)',
            color:
              !dirty || setWorkingHours.isPending
                ? 'var(--color-text-muted)'
                : '#fff',
            border: 'none',
            cursor:
              !dirty || setWorkingHours.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {setWorkingHours.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function BlockPills({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) {
    return (
      <span
        style={{
          fontStyle: 'italic',
          fontSize: '14px',
          color: 'var(--color-text-muted)',
        }}
      >
        No laborable
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {blocks.map((block) => (
        <span
          key={block.id}
          className="px-3 py-1 rounded-full"
          style={{
            border: '1px solid var(--color-brand-border)',
            color: 'var(--color-text-brand)',
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {formatRange(block)}
        </span>
      ))}
    </div>
  );
}

function UnsavedBadge() {
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '999px',
        backgroundColor: 'var(--color-brand-primary)',
        color: '#fff',
        whiteSpace: 'nowrap',
      }}
    >
      Sin guardar
    </span>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DayToggle({
  enabled,
  label,
  onChange,
}: {
  enabled: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      style={{
        position: 'relative',
        width: '44px',
        height: '26px',
        flexShrink: 0,
        padding: 0,
        border: 'none',
        borderRadius: '999px',
        cursor: 'pointer',
        backgroundColor: enabled
          ? 'var(--color-brand-primary)'
          : 'var(--color-border)',
        transition: 'background-color 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: enabled ? '21px' : '3px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
          transition: 'left 0.15s',
        }}
      />
    </button>
  );
}
