import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useCreateException } from './hooks/useCreateException';
import { useDeleteException } from './hooks/useDeleteException';
import { useExceptions } from './hooks/useExceptions';

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

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Fechas bloqueadas</h2>
      <form
        onSubmit={handleSubmit}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div>
          <label
            htmlFor="exception-date"
            className="mb-1 block text-sm font-medium"
          >
            Fecha
          </label>
          <input
            id="exception-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label
            htmlFor="exception-reason"
            className="mb-1 block text-sm font-medium"
          >
            Motivo (opcional)
          </label>
          <input
            id="exception-reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Vacaciones, cita médica…"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={!date || createException.isPending}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {createException.isPending ? 'Agregando…' : 'Bloquear fecha'}
        </button>
      </form>
      {createException.isError && (
        <p className="mb-4 text-sm text-red-600">
          {getApiErrorMessage(createException.error)}
        </p>
      )}

      {isLoading && <p>Cargando…</p>}
      {!isLoading && exceptions?.length === 0 && (
        <p className="text-sm text-gray-500">No tienes fechas bloqueadas.</p>
      )}
      {!isLoading && exceptions && exceptions.length > 0 && (
        <ul>
          {exceptions.map((exception) => (
            <li
              key={exception.id}
              className="flex items-center justify-between border-b border-gray-200 py-2"
            >
              <div>
                <p className="text-sm font-medium">{exception.date}</p>
                {exception.reason && (
                  <p className="text-xs text-gray-500">{exception.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteException.mutate(exception.id)}
                disabled={deleteException.isPending}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
