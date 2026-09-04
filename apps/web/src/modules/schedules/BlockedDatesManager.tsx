import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!date) {
      return;
    }
    createException.mutate(
      { date, reason: reason.trim() ? reason.trim() : undefined },
      {
        onSuccess: () => {
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
          <p className="text-sm text-red-600 dark:text-red-400">
            {getApiErrorMessage(createException.error)}
          </p>
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
                <button
                  type="button"
                  onClick={() => deleteException.mutate(exception.id)}
                  disabled={deleteException.isPending}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
