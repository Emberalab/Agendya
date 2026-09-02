import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Weekday } from '@agendya/types';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { BlockFormDrawer } from './BlockFormDrawer';
import {
  dayPartLabel,
  formatBlockDuration,
  formatRange,
  groupByDay,
  toDaysPayload,
  type Block,
} from './blocks';
import { useSetWorkingHours } from './hooks/useSetWorkingHours';
import { useWorkingHours } from './hooks/useWorkingHours';
import { WEEKDAY_LABELS, slugToWeekday } from './weekday';

type DrawerState =
  { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; index: number };

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
  const [applyToAll, setApplyToAll] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ mode: 'closed' });
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  useEffect(() => {
    setBlocks(serverByDay[weekday]);
  }, [serverByDay, weekday]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.startMinute - b.startMinute),
    [blocks],
  );

  const editingBlock =
    drawer.mode === 'edit' ? (sortedBlocks[drawer.index] ?? null) : null;
  const siblings =
    drawer.mode === 'edit'
      ? sortedBlocks.filter((_, i) => i !== drawer.index)
      : sortedBlocks;

  const handleDrawerSave = (block: Block, applyToAllDays: boolean) => {
    setBlocks((current) => {
      const sorted = [...current].sort((a, b) => a.startMinute - b.startMinute);
      if (drawer.mode === 'edit') {
        sorted[drawer.index] = block;
        return sorted;
      }
      return [...sorted, block];
    });
    if (applyToAllDays) setApplyToAll(true);
    setDrawer({ mode: 'closed' });
  };

  const removeBlock = (index: number) => {
    setBlocks((current) => {
      const sorted = [...current].sort((a, b) => a.startMinute - b.startMinute);
      return sorted.filter((_, i) => i !== index);
    });
  };

  const handleSave = () => {
    const nextByDay = { ...serverByDay, [weekday]: sortedBlocks };
    if (applyToAll) {
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
        <span style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>
          {WEEKDAY_LABELS[weekday]}
        </span>
      </nav>

      <h1
        className="text-[22px] lg:text-[26px]"
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4">
          <p className="text-sm text-red-600">
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
              backgroundColor: '#EEF2FF',
              color: 'var(--color-brand-primary)',
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
              key={`${block.startMinute}-${block.endMinute}-${index}`}
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
                style={{ color: 'var(--color-brand-primary)', flexShrink: 0 }}
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
                onClick={() => setDrawer({ mode: 'edit', index })}
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
                onClick={() => setConfirmIndex(index)}
                aria-label={`Eliminar bloque ${formatRange(block)}`}
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  border: '1px solid #FECDD3',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#EF4444',
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

      {applyToAll && (
        <p
          className="mt-3"
          style={{ fontSize: '12px', color: 'var(--color-brand-primary)' }}
        >
          Al guardar, estos bloques se copiarán a todos los días activos.
        </p>
      )}

      <div className="flex items-stretch gap-3 mt-5 sm:items-center sm:justify-between">
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
          disabled={setWorkingHours.isPending}
          className="order-1 flex-1 px-5 py-3 rounded-xl text-sm font-semibold sm:order-2 sm:flex-none"
          style={{
            backgroundColor: 'var(--color-brand-primary)',
            color: '#fff',
            border: '1px solid var(--color-brand-primary)',
            lineHeight: 1.25,
            cursor: setWorkingHours.isPending ? 'not-allowed' : 'pointer',
            opacity: setWorkingHours.isPending ? 0.7 : 1,
          }}
        >
          {setWorkingHours.isPending ? 'Guardando…' : 'Guardar configuración'}
        </button>
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

      {confirmIndex !== null && sortedBlocks[confirmIndex] && (
        <ConfirmDeleteBlockDialog
          block={sortedBlocks[confirmIndex]}
          onCancel={() => setConfirmIndex(null)}
          onConfirm={() => {
            removeBlock(confirmIndex);
            setConfirmIndex(null);
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
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.45)' }}
      onClick={onCancel}
    >
      <div
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
          style={{ backgroundColor: '#FFF1F2' }}
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
              backgroundColor: '#EF4444',
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
