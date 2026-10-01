import { useAuditLog } from './hooks/useAuditLog';
import { Card } from '../../../shared/components/Card';
import { LoadError } from '../../../shared/components/LoadError';
import { LoadMore } from '../../../shared/components/LoadMore';
import { Badge } from '../../../shared/components/Badge';

const ACTION_LABELS: Record<string, string> = {
  SUPPORT_VIEWED_PROFESSIONAL: 'Vio un profesional',
  SUPPORT_VIEWED_PROFESSIONAL_ACTIVITY: 'Vio la actividad de un profesional',
  TICKET_CREATED: 'Creó un ticket',
  TICKET_ASSIGNED: 'Reasignó un ticket',
  TICKET_STATUS_CHANGED: 'Cambió el estado de un ticket',
  TICKET_PRIORITY_CHANGED: 'Cambió la prioridad de un ticket',
  TICKET_MESSAGE_ADDED: 'Agregó un mensaje',
  INTERNAL_USER_CREATED: 'Creó un usuario interno',
  INTERNAL_USER_ROLE_CHANGED: 'Cambió el rol de un usuario interno',
  INTERNAL_USER_DEACTIVATED: 'Desactivó un usuario interno',
  INTERNAL_USER_PASSWORD_RESET: 'Restableció su contraseña',
  INTERNAL_USER_GOOGLE_LINKED: 'Vinculó su cuenta de Google',
};

export function AuditLogPage() {
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useAuditLog();
  const items = data?.pages.flatMap((page) => page.items);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-bold text-text-primary">Auditoría</h1>
      <p className="mt-1 text-sm text-text-muted">Registro inmutable de acciones del equipo en el Backoffice.</p>

      <Card className="mt-4" padding="none">
        {isLoading && <p className="p-4 text-sm text-text-muted">Cargando…</p>}
        {isError && <LoadError what="la auditoría" onRetry={() => void refetch()} />}
        {items && items.length === 0 && <p className="p-4 text-sm text-text-muted">Sin actividad todavía.</p>}
        {items && items.length > 0 && (
          <ul className="divide-y divide-border">
            {items.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{entry.actor.name}</span> {ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="text-xs text-text-muted">
                    {entry.entityType} · {entry.entityId}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary" size="sm" dot={false}>
                    {new Date(entry.createdAt).toLocaleString('es-CO')}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <LoadMore
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => void fetchNextPage()}
      />
    </div>
  );
}
