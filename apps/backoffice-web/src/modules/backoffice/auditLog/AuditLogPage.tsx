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
      <h1 className="text-xl font-bold text-text-primary">Auditoría</h1>
      <p className="mt-1 text-sm text-text-muted">Registro inmutable de acciones del equipo en el Backoffice.</p>

      <Card className="mt-4" padding="none">
        {isLoading && <p className="p-4 text-sm text-text-muted">Cargando…</p>}
        {data && data.items.length === 0 && <p className="p-4 text-sm text-text-muted">Sin actividad todavía.</p>}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-border">
            {data.items.map((entry) => (
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
    </div>
  );
}
