import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { MessageVisibility, TicketPriority, TicketStatus } from '@agendya/types';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@agendya/types';
import { useTicket } from './hooks/useTicket';
import {
  useAddTicketMessage,
  useAssignTicket,
  useUpdateTicketPriority,
  useUpdateTicketStatus,
} from './hooks/useTicketMutations';
import { useBackofficeAuthStore } from '../auth/backofficeAuthStore';
import { roleHasPermission } from '../shared/permissions';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '../shared/badges';
import { TICKET_CATEGORY_LABELS } from '../shared/categoryLabels';
import { authorLabel } from '../shared/messageAuthor';

export function TicketDetailPage() {
  const { id = '' } = useParams();
  const { data: ticket, isLoading, error } = useTicket(id);
  const user = useBackofficeAuthStore((state) => state.user);
  const canMutate = roleHasPermission(user?.role, 'MUTATE_TICKETS');
  const canAssignAny = roleHasPermission(user?.role, 'ASSIGN_ANY_TICKET');

  const addMessage = useAddTicketMessage(id);
  const updateStatus = useUpdateTicketStatus(id);
  const updatePriority = useUpdateTicketPriority(id);
  const assign = useAssignTicket(id);

  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<MessageVisibility>('INTERNAL_NOTE');

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  if (error || !ticket) {
    return (
      <div className="p-6 text-sm text-red-600 dark:text-red-400">
        No se pudo cargar este ticket.
      </div>
    );
  }

  const onSend = async () => {
    if (!body.trim()) return;
    await addMessage.mutateAsync({ body: body.trim(), visibility });
    setBody('');
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <Link
          to={`/backoffice/professionals/${ticket.professional.id}`}
          className="hover:underline"
        >
          {ticket.professional.businessName}
        </Link>
        {' · '}
        {TICKET_CATEGORY_LABELS[ticket.category]}
        {ticket.relatedBookingId && (
          <>
            {' · '}
            <Link
              to={`/backoffice/appointments/${ticket.relatedBookingId}`}
              className="hover:underline"
            >
              Ver cita relacionada
            </Link>
          </>
        )}
      </p>
      <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
        {ticket.subject}
      </h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mr-2 text-gray-500 dark:text-gray-400">Estado</span>
          <select
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            value={ticket.status}
            disabled={!canMutate || updateStatus.isPending}
            onChange={(event) =>
              updateStatus.mutate({ status: event.target.value as TicketStatus })
            }
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mr-2 text-gray-500 dark:text-gray-400">Prioridad</span>
          <select
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            value={ticket.priority}
            disabled={!canMutate || updatePriority.isPending}
            onChange={(event) =>
              updatePriority.mutate({ priority: event.target.value as TicketPriority })
            }
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TICKET_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        {(canAssignAny || ticket.assignedTo === null || ticket.assignedTo.id === user?.id) &&
          canMutate && (
            <Button
              size="sm"
              variant="outline"
              disabled={assign.isPending}
              onClick={() => {
                const alreadyMine = ticket.assignedTo?.id === user?.id;
                assign.mutate({ assignedToId: alreadyMine ? null : user!.id });
              }}
            >
              {ticket.assignedTo?.id === user?.id
                ? 'Quitarme la asignación'
                : 'Asignarme'}
            </Button>
          )}

        <Badge variant="secondary">
          {ticket.assignedTo ? `Asignado a ${ticket.assignedTo.name}` : 'Sin asignar'}
        </Badge>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Conversación
      </h2>
      <div className="flex flex-col gap-2">
        {ticket.messages.map((message) => (
          <Card
            key={message.id}
            padding="sm"
            className={
              message.visibility === 'INTERNAL_NOTE'
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30'
                : ''
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {authorLabel(message.author)}
              </span>
              <span className="text-xs text-gray-400">
                {message.visibility === 'INTERNAL_NOTE' ? 'Nota interna' : 'Visible al profesional'}
                {' · '}
                {new Date(message.createdAt).toLocaleString('es-CO')}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
              {message.body}
            </p>
          </Card>
        ))}
      </div>

      {canMutate && (
        <div className="mt-4">
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            rows={3}
            placeholder="Escribe una respuesta o nota interna…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={visibility === 'CUSTOMER_VISIBLE'}
                onChange={(event) =>
                  setVisibility(event.target.checked ? 'CUSTOMER_VISIBLE' : 'INTERNAL_NOTE')
                }
              />
              Visible para el profesional
            </label>
            <Button size="sm" disabled={!body.trim() || addMessage.isPending} onClick={onSend}>
              {addMessage.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
