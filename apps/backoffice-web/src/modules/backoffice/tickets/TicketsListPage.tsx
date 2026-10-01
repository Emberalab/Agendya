import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TicketPriority, TicketStatus } from '@agendya/types';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@agendya/types';
import { useTickets } from './hooks/useTickets';
import { Card } from '../../../shared/components/Card';
import { Select } from '../../../shared/components/Select';
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
        <h1 className="text-xl font-bold text-text-primary">Tickets</h1>
        <NewTicketButton />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="w-48">
          <Select
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
          </Select>
        </div>
        <div className="w-40">
          <Select
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
          </Select>
        </div>
      </div>

      <Card className="mt-4" padding="none">
        {isLoading && <p className="p-4 text-sm text-text-muted">Cargando…</p>}
        {data && data.items.length === 0 && <p className="p-4 text-sm text-text-muted">No hay tickets con estos filtros.</p>}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-border">
            {data.items.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to={`/backoffice/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-surface-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{ticket.subject}</p>
                    <p className="truncate text-xs text-text-muted">
                      {ticket.professional.businessName} · {ticket.assignedTo ? ticket.assignedTo.name : 'Sin asignar'}
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
