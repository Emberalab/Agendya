import { useAuditLog } from './hooks/useAuditLog';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';

const ACTION_LABELS: Record<string, string> = {
  SUPPORT_VIEWED_PROFESSIONAL: 'Vio un profesional',
  TICKET_CREATED: 'Creó un ticket',
  TICKET_ASSIGNED: 'Reasignó un ticket',
  TICKET_STATUS_CHANGED: 'Cambió el estado de un ticket',
  TICKET_PRIORITY_CHANGED: 'Cambió la prioridad de un ticket',
  TICKET_MESSAGE_ADDED: 'Agregó un mensaje',
  INTERNAL_USER_CREATED: 'Creó un usuario interno',
  INTERNAL_USER_ROLE_CHANGED: 'Cambió el rol de un usuario interno',
  INTERNAL_USER_DEACTIVATED: 'Desactivó un usuario interno',
};

export function AuditLogPage() {
  const { data, isLoading } = useAuditLog();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Auditoría</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Registro inmutable de acciones del equipo en el Backoffice.
      </p>

      <Card className="mt-4" padding="none">
        {isLoading && <p className="p-4 text-sm text-gray-500">Cargando…</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
            Sin actividad todavía.
          </p>
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.items.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium">{entry.actor.name}</span>{' '}
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {entry.entityType} · {entry.entityId}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary" size="sm">
                    {new Date(entry.createdAt).toLocaleString('es-CO')}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
