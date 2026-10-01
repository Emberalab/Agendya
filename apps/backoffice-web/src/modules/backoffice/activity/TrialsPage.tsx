import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TrialListQuery } from '@agendya/types';
import { useTrials } from './hooks/useActivity';
import { relativeDays } from './activityLabels';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Select } from '../../../shared/components/Select';

type Status = TrialListQuery['status'];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'ENDED', label: 'Finalizadas' },
];

const dateFormat = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Accounts with a full-access trial — the entry point to their activity. */
export function TrialsPage() {
  const [status, setStatus] = useState<Status>('ALL');
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrials(status);
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-bold text-text-primary">Pruebas</h1>
      <p className="mt-1 text-sm text-text-muted">
        Cuentas con periodo de prueba de acceso completo. Abre una para ver qué
        hizo durante la prueba.
      </p>

      <div className="mt-4 w-44">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          aria-label="Estado de la prueba"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="mt-4" padding="none">
        {isLoading && <p className="p-4 text-sm text-text-muted">Cargando…</p>}
        {isError && (
          <p className="p-4 text-sm text-danger">
            No se pudieron cargar las pruebas.
          </p>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <p className="p-4 text-sm text-text-muted">
            No hay cuentas con prueba para este filtro.
          </p>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-border">
            {items.map((trial) => (
              <li key={trial.id}>
                <Link
                  to={`/backoffice/professionals/${trial.id}/activity`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {trial.businessName}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {trial.email} ·{' '}
                      {dateFormat.format(new Date(trial.startedAt))} –{' '}
                      {dateFormat.format(new Date(trial.endsAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span>{trial.bookingsInTrial} citas</span>
                    <span>·</span>
                    <span>
                      {trial.lastActivityAt
                        ? `Activo ${relativeDays(trial.lastActivityAt)}`
                        : 'Sin actividad'}
                    </span>
                    {trial.status === 'ACTIVE' ? (
                      <Badge variant="success">
                        Quedan {trial.daysRemaining} días
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Finalizada</Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}
    </div>
  );
}
