import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
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
    <Card>
      <CardHeader>
        <CardTitle>Fechas bloqueadas</CardTitle>
        <CardDescription>
          Bloquea días específicos en los que no estarás disponible
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="mb-6 flex flex-wrap items-end gap-3"
        >
          <Input
            id="exception-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            label="Fecha"
          />
          <Input
            id="exception-reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            label="Motivo (opcional)"
            placeholder="Vacaciones, cita médica…"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!date || createException.isPending}
          >
            {createException.isPending ? 'Agregando…' : 'Bloquear fecha'}
          </Button>
        </form>

        {createException.isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">
              {getApiErrorMessage(createException.error)}
            </p>
          </div>
        )}

        {isLoading && (
          <p className="py-4 text-center text-gray-500">Cargando…</p>
        )}
        {!isLoading && exceptions?.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">No tienes fechas bloqueadas.</p>
          </div>
        )}
        {!isLoading && exceptions && exceptions.length > 0 && (
          <div className="space-y-2">
            {exceptions.map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{exception.date}</p>
                  {exception.reason && (
                    <p className="text-xs text-gray-600">{exception.reason}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => deleteException.mutate(exception.id)}
                  disabled={deleteException.isPending}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
