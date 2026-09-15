import { Link } from 'react-router-dom';
import { useDashboardSummary } from './hooks/useDashboard';
import { Card } from '../../../shared/components/Card';
import { TicketPriorityBadge, TicketStatusBadge } from '../shared/badges';

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card padding="sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </Card>
  );
}

export function BackofficeDashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Panel</h1>

      {isLoading && <p className="mt-4 text-sm text-gray-500">Cargando…</p>}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Tickets abiertos" value={data.openTickets} />
            <StatTile label="Urgentes" value={data.urgentTickets} />
            <StatTile
              label="Esperando profesional"
              value={data.waitingForCustomerTickets}
            />
            <StatTile label="Sin asignar" value={data.unassignedTickets} />
          </div>

          <h2 className="mt-8 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Actividad reciente
          </h2>
          <Card className="mt-2" padding="none">
            {data.recentTickets.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
                No hay tickets activos.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.recentTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      to={`/backoffice/tickets/${ticket.id}`}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {ticket.subject}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {ticket.professional.businessName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <TicketPriorityBadge priority={ticket.priority} />
                        <TicketStatusBadge status={ticket.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
