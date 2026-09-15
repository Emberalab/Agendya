import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TicketPriority, TicketStatus } from '@agendya/types';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@agendya/types';
import { useTickets } from './hooks/useTickets';
import { Card } from '../../../shared/components/Card';
import { TicketPriorityBadge, TicketStatusBadge, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '../shared/badges';
import { NewTicketButton } from './NewTicketButton';

export function TicketsListPage() {
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');

  const { data, isLoading } = useTickets({
    status: status || undefined,
    priority: priority || undefined,
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tickets</h1>
        <NewTicketButton />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          value={status}
          onChange={(event) => setStatus(event.target.value as TicketStatus | '')}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          value={priority}
          onChange={(event) => setPriority(event.target.value as TicketPriority | '')}
          aria-label="Filtrar por prioridad"
        >
          <option value="">Toda prioridad</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {TICKET_PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <Card className="mt-4" padding="none">
        {isLoading && <p className="p-4 text-sm text-gray-500">Cargando…</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
            No hay tickets con estos filtros.
          </p>
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.items.map((ticket) => (
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
                      {ticket.professional.businessName} ·{' '}
                      {ticket.assignedTo ? ticket.assignedTo.name : 'Sin asignar'}
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
    </div>
  );
}
