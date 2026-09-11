import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Weekday } from '@agendya/types';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { BlockFormDrawer } from './BlockFormDrawer';
import {
  dayPartLabel,
  formatBlockDuration,
  formatRange,
  groupByDay,
  serializeBlocks,
  toDaysPayload,
  type Block,
} from './blocks';
import { useSetWorkingHours } from './hooks/useSetWorkingHours';
import { useWorkingHours } from './hooks/useWorkingHours';
import { WEEKDAY_LABELS, slugToWeekday } from './weekday';

type DrawerState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; id: string };

export function DaySchedulePage() {
  const { day } = useParams<{ day: string }>();
  const weekday = slugToWeekday(day);

  if (!weekday) {
    return <Navigate to="/dashboard/schedule" replace />;
  }

  return <DayScheduleEditor weekday={weekday} />;
}

function DayScheduleEditor({ weekday }: { weekday: Weekday }) {
  const navigate = useNavigate();
  const { data: workingHours, isLoading } = useWorkingHours();
  const setWorkingHours = useSetWorkingHours();

  const serverByDay = useMemo(
    () => groupByDay(workingHours ?? []),
    [workingHours],
  );

  const [blocks, setBlocks] = useState<Block[]>([]);
  // Always visible on this page (not tucked inside the per-block modal, see
  // BlockFormDrawer.tsx) precisely so the professional can *see* whether
  // it's on before saving — a hidden, modal-scoped checkbox that silently
  // resets every time this page remounts (e.g. after a save navigates away
  // and they come back to add one more block) was the root cause of a block
  // added in a later visit quietly never reaching the other days.
  const [applyToAll, setApplyToAll] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ mode: 'closed' });
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null);

  useEffect(() => {
    setBlocks(serverByDay[weekday]);
  }, [serverByDay, weekday]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.startMinute - b.startMinute),
    [blocks],
  );

  const editingBlock =
    drawer.mode === 'edit'
      ? (sortedBlocks.find((b) => b.id === drawer.id) ?? null)
      : null;
  const siblings =
    drawer.mode === 'edit'
      ? sortedBlocks.filter((b) => b.id !== drawer.id)
      : sortedBlocks;

  // Blocks are matched by their stable `id` (see blocks.ts), never by
  // position — `sortedBlocks` is re-derived (and re-ordered) on every render,
  // so an index captured when a row's "editar"/"eliminar" was clicked could
  // point at a different block, or nothing, by the time it was acted on.
  const handleDrawerSave = (block: Block) => {
    setBlocks((current) =>
      drawer.mode === 'edit'
        ? current.map((b) => (b.id === drawer.id ? block : b))
        : [...current, block],
    );
    setDrawer({ mode: 'closed' });
  };

  const removeBlock = (id: string) => {
    setBlocks((current) => current.filter((b) => b.id !== id));
  };

  const dirty =
    serializeBlocks(sortedBlocks) !== serializeBlocks(serverByDay[weekday]) ||
    applyToAll;

  const handleSave = () => {
    const nextByDay = { ...serverByDay, [weekday]: sortedBlocks };
    // Only ever copy a day that actually has something to copy — an emptied
    // "source" day (every block just deleted) must never wipe every other
    // active day's schedule out from under it. Days that are off
    // (`length === 0`) are left off; copying never turns a day on by itself.
    if (applyToAll && sortedBlocks.length > 0) {
      for (const key of Object.keys(nextByDay) as Weekday[]) {
        if (key !== weekday && nextByDay[key].length > 0) {
          nextByDay[key] = sortedBlocks.map((b) => ({ ...b }));
        }
      }
    }
    setWorkingHours.mutate(
      { days: toDaysPayload(nextByDay) },
      { onSuccess: () => navigate('/dashboard/schedule') },
    );
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="w-full">
      <nav
        className="flex items-center gap-2 mb-3"
        style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/dashboard/schedule')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
          }}
        >
          Horario
        </button>
        <span>›</span>
        <span style={{ color: 'var(--color-text-brand)', fontWeight: 600 }}>
          {WEEKDAY_LABELS[weekday]}
        </span>
      </nav>

      <h1
        className="text-[24px] lg:text-[28px]"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '4px',
        }}
      >
        Configurar {WEEKDAY_LABELS[weekday]}
      </h1>
      <p
        className="text-[13px] lg:text-sm mb-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Personaliza las jornadas y pausas regulares de este día.
      </p>

      {setWorkingHours.isError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            {getApiErrorMessage(setWorkingHours.error)}
          </p>
        </div>
      )}

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--color-text-primary)',
            }}
          >
            Bloques de Trabajo
          </h2>
          <button
            type="button"
            onClick={() => setDrawer({ mode: 'create' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: 'var(--color-brand-surface)',
              color: 'var(--color-text-brand)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M6.5 2v9M2 6.5h9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <span className="sm:hidden">Agregar</span>
            <span className="hidden sm:inline">Agregar bloque</span>
          </button>
        </div>

        {isLoading ? (
          <p
            className="px-4 py-10 text-center sm:px-6"
            style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}
          >
            Cargando…
          </p>
        ) : sortedBlocks.length === 0 ? (
          <p
            className="px-4 py-10 text-center sm:px-6"
            style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}
          >
            Este día no tiene bloques de trabajo. Agrega uno para recibir
            reservas.
          </p>
        ) : (
          sortedBlocks.map((block, index) => (
            <div
              key={block.id}
              className="flex items-center gap-2 px-4 py-4 sm:gap-3 sm:px-6"
              style={{
                borderTop: index > 0 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ color: 'var(--color-text-brand)', flexShrink: 0 }}
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6.25"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 4.5V8l2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <div className="min-w-0">
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: '16px',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {formatRange(block)}
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-text-muted)',
                    marginTop: '1px',
                  }}
                >
                  {dayPartLabel(block)} ({formatBlockDuration(block)})
                </p>
              </div>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => setDrawer({ mode: 'edit', id: block.id })}
                aria-label={`Editar bloque ${formatRange(block)}`}
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  border: '1px solid var(--color-border)',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setConfirmBlockId(block.id)}
                aria-label={`Eliminar bloque ${formatRange(block)}`}
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  border: '1px solid var(--color-danger-border)',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-danger)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2.5 4h9M5.5 4V2.8h3V4M3.8 4l.6 7.2a1 1 0 0 0 1 .8h3.2a1 1 0 0 0 1-.8L10.2 4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <label
        className="flex gap-3 rounded-xl p-4 mt-4 cursor-pointer"
        style={{
          // Matches the codebase's established "active/selected" treatment
          // (see Calendar.tsx, BookingWizard.tsx, ProfilePage.tsx drag-over)
          // rather than the neutral --color-surface-soft, which reads at the
          // same tone as the page background and made this control easy to
          // miss entirely — see the reported "the checkbox disappeared" bug.
          backgroundColor: applyToAll
            ? 'var(--color-brand-surface)'
            : 'var(--color-surface)',
          border: `1px solid ${applyToAll ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}
      >
        <input
          type="checkbox"
          checked={applyToAll}
          onChange={(e) => setApplyToAll(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            flexShrink: 0,
            marginTop: '1px',
            accentColor: 'var(--color-brand-primary)',
          }}
        />
        <span>
          <span
            style={{
              display: 'block',
              fontWeight: 600,
              fontSize: '14px',
              color: applyToAll
                ? 'var(--color-text-brand)'
                : 'var(--color-text-primary)',
              marginBottom: '2px',
            }}
          >
            Aplicar a todos los días activos
          </span>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
            }}
          >
            Al guardar, estos bloques reemplazarán los de todos los días que
            tengas activos. Los días desactivados no se ven afectados.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-3 mt-5 sm:flex-row sm:items-center sm:justify-between">
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {setWorkingHours.isSuccess && !dirty
            ? 'Configuración guardada.'
            : dirty
              ? 'Tienes cambios sin guardar.'
              : 'Los cambios se aplican de inmediato a tu página de reservas.'}
        </p>
        <div className="flex items-stretch gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/schedule')}
            className="order-2 flex-1 rounded-xl text-sm font-semibold px-5 py-3 sm:order-1 sm:flex-none"
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            Volver a horario
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || setWorkingHours.isPending}
            className="order-1 flex-1 px-5 py-3 rounded-xl text-sm font-semibold sm:order-2 sm:flex-none"
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
              lineHeight: 1.25,
              cursor:
                !dirty || setWorkingHours.isPending
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {setWorkingHours.isPending ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </div>

      {drawer.mode !== 'closed' && (
        <BlockFormDrawer
          initial={editingBlock}
          siblings={siblings}
          saving={false}
          onCancel={() => setDrawer({ mode: 'closed' })}
          onSave={handleDrawerSave}
        />
      )}

      {confirmBlockId !== null &&
        sortedBlocks.find((b) => b.id === confirmBlockId) && (
          <ConfirmDeleteBlockDialog
            block={sortedBlocks.find((b) => b.id === confirmBlockId)!}
            onCancel={() => setConfirmBlockId(null)}
            onConfirm={() => {
              removeBlock(confirmBlockId);
              setConfirmBlockId(null);
            }}
          />
        )}
    </div>
  );
}

function ConfirmDeleteBlockDialog({
  block,
  onCancel,
  onConfirm,
}: {
  block: Block;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onCancel);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar bloque"
        className="w-full max-w-[400px] rounded-3xl p-7 flex flex-col items-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--color-danger-surface)' }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 3.5l8 14H3l8-14z"
              stroke="#EF4444"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M11 9v3.5"
              stroke="#EF4444"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="11" cy="15" r="1" fill="#EF4444" />
          </svg>
        </div>
        <h2
          className="text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '19px',
            color: 'var(--color-text-primary)',
          }}
        >
          ¿Eliminar bloque?
        </h2>
        <p
          className="text-center mt-1.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.55',
          }}
        >
          El bloque{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>
            {formatRange(block)}
          </strong>{' '}
          se eliminará permanentemente. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 w-full mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-danger-fill)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
