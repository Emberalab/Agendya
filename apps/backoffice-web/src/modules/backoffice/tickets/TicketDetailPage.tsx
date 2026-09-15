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
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import { BackLink } from '../../../shared/components/BackLink';
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

  if (isLoading) return <div className="p-6 text-sm text-text-muted">Cargando…</div>;
  if (error || !ticket) {
    return (
      <div className="p-6">
        <BackLink to="/backoffice/tickets">Volver a tickets</BackLink>
        <p className="text-sm text-danger">No se pudo cargar este ticket.</p>
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
      <BackLink to="/backoffice/tickets">Volver a tickets</BackLink>

      <p className="text-xs text-text-muted">
        <Link to={`/backoffice/professionals/${ticket.professional.id}`} className="hover:underline">
          {ticket.professional.businessName}
        </Link>
        {' · '}
        {TICKET_CATEGORY_LABELS[ticket.category]}
        {ticket.relatedBookingId && (
          <>
            {' · '}
            <Link to={`/backoffice/appointments/${ticket.relatedBookingId}`} className="hover:underline">
              Ver cita relacionada
            </Link>
          </>
        )}
      </p>
      <h1 className="mt-1 text-xl font-bold text-text-primary">{ticket.subject}</h1>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Select
            label="Estado"
            value={ticket.status}
            disabled={!canMutate || updateStatus.isPending}
            onChange={(event) => updateStatus.mutate({ status: event.target.value as TicketStatus })}
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-36">
          <Select
            label="Prioridad"
            value={ticket.priority}
            disabled={!canMutate || updatePriority.isPending}
            onChange={(event) => updatePriority.mutate({ priority: event.target.value as TicketPriority })}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TICKET_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>

        {(canAssignAny || ticket.assignedTo === null || ticket.assignedTo.id === user?.id) && canMutate && (
          <Button
            size="sm"
            variant="outline"
            disabled={assign.isPending}
            onClick={() => {
              const alreadyMine = ticket.assignedTo?.id === user?.id;
              assign.mutate({ assignedToId: alreadyMine ? null : user!.id });
            }}
          >
            {ticket.assignedTo?.id === user?.id ? 'Quitarme la asignación' : 'Asignarme'}
          </Button>
        )}

        <Badge variant="secondary" dot={false}>
          {ticket.assignedTo ? `Asignado a ${ticket.assignedTo.name}` : 'Sin asignar'}
        </Badge>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-text-secondary">Conversación</h2>
      <div className="flex flex-col gap-2">
        {ticket.messages.map((message) => (
          <Card
            key={message.id}
            padding="sm"
            className={message.visibility === 'INTERNAL_NOTE' ? 'border-warning-border bg-warning-surface' : ''}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-secondary">{authorLabel(message.author)}</span>
              <span className="text-xs text-text-muted">
                {message.visibility === 'INTERNAL_NOTE' ? 'Nota interna' : 'Visible al profesional'}
                {' · '}
                {new Date(message.createdAt).toLocaleString('es-CO')}
              </span>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{message.body}</p>
          </Card>
        ))}
      </div>

      {canMutate && (
        <div className="mt-4">
          <Textarea
            rows={3}
            placeholder="Escribe una respuesta o nota interna…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={visibility === 'CUSTOMER_VISIBLE'}
                onChange={(event) => setVisibility(event.target.checked ? 'CUSTOMER_VISIBLE' : 'INTERNAL_NOTE')}
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
