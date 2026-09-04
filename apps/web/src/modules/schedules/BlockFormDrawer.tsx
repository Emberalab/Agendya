import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { minutesToTimeString, timeStringToMinutes } from './time.util';
import { findOverlap, formatRange, type Block } from './blocks';

interface BlockFormDrawerProps {
  /** The block being edited, or null when adding a new one. */
  initial: Block | null;
  /** Other blocks already configured for this day (used for overlap detection). */
  siblings: Block[];
  saving: boolean;
  onCancel: () => void;
  onSave: (block: Block, applyToAllDays: boolean) => void;
}

export function BlockFormDrawer({
  initial,
  siblings,
  saving,
  onCancel,
  onSave,
}: BlockFormDrawerProps) {
  const [startTime, setStartTime] = useState(
    initial ? minutesToTimeString(initial.startMinute) : '09:00',
  );
  const [endTime, setEndTime] = useState(
    initial ? minutesToTimeString(initial.endMinute) : '15:00',
  );
  const [applyToAllDays, setApplyToAllDays] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const startMinute = timeStringToMinutes(startTime);
  const endMinute = timeStringToMinutes(endTime);
  const candidate: Block = { startMinute, endMinute };

  const invalidRange = endMinute <= startMinute;
  const overlap = invalidRange ? null : findOverlap(candidate, siblings);
  const canSave = !invalidRange && !overlap && !saving;

  const isEdit = initial !== null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-end sm:items-stretch"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Editar bloque' : 'Nuevo bloque'}
        className="w-full flex flex-col rounded-t-2xl max-h-[92vh] sm:h-full sm:max-h-none sm:max-w-[400px] sm:rounded-none"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 -8px 44px rgba(15,23,42,0.18)',
          fontFamily: 'var(--font-body)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <span
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '999px',
              backgroundColor: 'var(--color-border)',
            }}
          />
        </div>

        <div
          className="flex items-center justify-between px-6 pt-4 pb-4 sm:pt-5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '18px',
              color: 'var(--color-text-primary)',
            }}
          >
            {isEdit ? 'Editar Bloque' : 'Nuevo Bloque'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <TimeField
            id="block-start"
            label="Hora de inicio"
            value={startTime}
            invalid={invalidRange || Boolean(overlap)}
            onChange={setStartTime}
          />
          <TimeField
            id="block-end"
            label="Hora de fin"
            value={endTime}
            invalid={invalidRange || Boolean(overlap)}
            onChange={setEndTime}
          />

          {invalidRange && (
            <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
              La hora de fin debe ser posterior a la de inicio.
            </p>
          )}

          {overlap && (
            <div
              className="flex gap-3 rounded-xl p-4"
              style={{
                backgroundColor: '#FFF7ED',
                border: '1px solid #FED7AA',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                style={{ flexShrink: 0, marginTop: '1px' }}
              >
                <circle
                  cx="9"
                  cy="9"
                  r="7.25"
                  stroke="#EA580C"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 5.5V9.5"
                  stroke="#EA580C"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="12.2" r="0.9" fill="#EA580C" />
              </svg>
              <div>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    color: '#C2410C',
                    marginBottom: '2px',
                  }}
                >
                  Horario superpuesto
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#9A3412',
                    lineHeight: '1.5',
                  }}
                >
                  El bloque {formatRange(candidate)} se superpone con el bloque
                  existente de {formatRange(overlap)}. Ajusta las horas para
                  evitar conflictos.
                </p>
              </div>
            </div>
          )}

          <label
            className="flex gap-3 rounded-xl p-4 cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface-soft)' }}
          >
            <input
              type="checkbox"
              checked={applyToAllDays}
              onChange={(e) => setApplyToAllDays(e.target.checked)}
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
                  color: 'var(--color-text-primary)',
                  marginBottom: '2px',
                }}
              >
                Aplicar a todos los días
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.5',
                }}
              >
                Al activar esta opción, la configuración se aplicará
                automáticamente a todos los días que tengas activos.
              </span>
            </span>
          </label>
        </div>

        <div
          className="flex gap-3 px-6 py-5"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{
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
            disabled={!canSave}
            onClick={() => onSave(candidate, applyToAllDays)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{
              backgroundColor: canSave
                ? 'var(--color-brand-primary)'
                : 'var(--color-border)',
              color: canSave ? '#fff' : 'var(--color-text-muted)',
              border: 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TimeField({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '14px',
          color: 'var(--color-text-primary)',
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: '46px',
          borderRadius: '8px',
          border: `1px solid ${invalid ? '#FCA5A5' : 'var(--color-border)'}`,
          padding: '0 12px',
          backgroundColor: 'var(--color-surface)',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          color: 'var(--color-text-primary)',
          outline: 'none',
        }}
      />
    </div>
  );
}
