import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { AffectedBookingsPanel } from './AffectedBookingsPanel';
import { useCreateException } from './hooks/useCreateException';
import { useDeleteException } from './hooks/useDeleteException';
import { useExceptions } from './hooks/useExceptions';

function formatDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const fieldStyle = {
  width: '100%',
  height: '46px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  padding: '0 12px',
  backgroundColor: 'var(--color-surface)',
  fontFamily: 'var(--font-body)',
  fontSize: '15px',
  color: 'var(--color-text-primary)',
  outline: 'none',
} as const;

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        marginBottom: '6px',
      }}
    >
      {children}
    </label>
  );
}

export function BlockedDatesManager() {
  const { data: exceptions, isLoading } = useExceptions();
  const createException = useCreateException();
  const deleteException = useDeleteException();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  // Blocking a date only stops *new* bookings from landing on it — it never
  // touches appointments already on the books there. When the professional
  // just blocked a date that already has confirmed appointments, remember
  // that here so we can say so explicitly instead of letting the agenda's
  // unchanged appointment list look like a bug.
  const [keptAppointments, setKeptAppointments] = useState<{
    date: string;
    count: number;
  } | null>(null);
  // The date currently open in AffectedBookingsPanel — either right after
  // blocking a date that already had bookings, or reopened later from the
  // list below. Resolving those bookings (cancel/reschedule) is always a
  // separate, explicit action from blocking itself.
  const [viewingDate, setViewingDate] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!date) {
      return;
    }
    setKeptAppointments(null);
    createException.mutate(
      { date, reason: reason.trim() ? reason.trim() : undefined },
      {
        onSuccess: (created) => {
          if (created.affectedBookingsCount) {
            setKeptAppointments({
              date: created.date,
              count: created.affectedBookingsCount,
            });
          }
          setDate('');
          setReason('');
        },
      },
    );
  };

  const canSubmit = Boolean(date) && !createException.isPending;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '16px',
          color: 'var(--color-text-primary)',
        }}
      >
        Fechas bloqueadas
      </h2>
      <p
        className="mb-5"
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginTop: '2px',
        }}
      >
        Bloquea días específicos en los que no estarás disponible.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        <div className="sm:w-56">
          <Label htmlFor="exception-date">Fecha</Label>
          <input
            id="exception-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            style={fieldStyle}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="exception-reason">Motivo (opcional)</Label>
          <input
            id="exception-reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Vacaciones, cita médica…"
            style={fieldStyle}
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-5 py-3 rounded-xl text-sm font-semibold sm:shrink-0"
          style={{
            height: '46px',
            backgroundColor: canSubmit
              ? 'var(--color-brand-primary)'
              : 'var(--color-border)',
            color: canSubmit ? '#fff' : 'var(--color-text-muted)',
            border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {createException.isPending ? 'Agregando…' : 'Bloquear fecha'}
        </button>
      </form>

      {createException.isError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3">
          <p
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
            className="text-red-600 dark:text-red-400"
          >
            {getApiErrorMessage(createException.error)}
          </p>
        </div>
      )}

      {keptAppointments && (
        // A warning, not an info toast: it flags a pending decision (what to
        // do with real customer bookings), not a neutral FYI — reuses the
        // app's --status-pending-* (amber) tokens, the same visual language
        // as a "Pendiente" booking, rather than a one-off blue. See the
        // analogous "Horario superpuesto" warning in BlockFormDrawer.tsx.
        <div
          role="status"
          className="mt-4 rounded-lg border p-3"
          style={{
            borderColor: 'var(--status-pending-border)',
            backgroundColor: 'var(--status-pending-bg)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              marginBottom: '8px',
              color: 'var(--status-pending-color)',
            }}
          >
            Ya tienes {keptAppointments.count}{' '}
            {keptAppointments.count === 1
              ? 'cita confirmada'
              : 'citas confirmadas'}{' '}
            para el {formatDate(keptAppointments.date)}. Bloquear esta fecha
            no las cancela por sí sola — siguen en tu Agenda hasta que tú
            decidas qué hacer con ellas.
          </p>
          <button
            type="button"
            onClick={() => setViewingDate(keptAppointments.date)}
            className="px-3 py-1.5 rounded-lg"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid var(--status-pending-color)',
              background: 'none',
              color: 'var(--status-pending-color)',
              cursor: 'pointer',
            }}
          >
            Ver y gestionar estas citas
          </button>
        </div>
      )}

      <div className="mt-5">
        {isLoading && (
          <p
            className="py-6 text-center"
            style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}
          >
            Cargando…
          </p>
        )}

        {!isLoading && exceptions?.length === 0 && (
          <div
            className="rounded-xl px-6 py-8 text-center"
            style={{
              backgroundColor: 'var(--color-surface-soft)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              No tienes fechas bloqueadas.
            </p>
          </div>
        )}

        {!isLoading && exceptions && exceptions.length > 0 && (
          <div className="flex flex-col gap-2">
            {exceptions.map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <div className="min-w-0">
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {formatDate(exception.date)}
                  </p>
                  {exception.reason && (
                    <p
                      className="truncate"
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      {exception.reason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingDate(exception.date)}
                    className="px-3 py-1.5 rounded-lg"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid var(--color-border)',
                      background: 'none',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Ver citas
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteException.mutate(exception.id)}
                    disabled={deleteException.isPending}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{
                      border: '1px solid var(--color-danger-border)',
                      background: 'none',
                      color: 'var(--color-danger)',
                      cursor: deleteException.isPending
                        ? 'not-allowed'
                        : 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingDate && (
        <AffectedBookingsPanel
          date={viewingDate}
          onClose={() => setViewingDate(null)}
        />
      )}
    </div>
  );
}
