import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMyTicket } from './hooks/useMyTicket';
import { useAddMyTicketMessage } from './hooks/useSupportMutations';
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from './labels';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';

export function SupportTicketDetailPage() {
  const { id = '' } = useParams();
  const { data: ticket, isLoading, isError } = useMyTicket(id);
  const addMessage = useAddMyTicketMessage(id);
  const [body, setBody] = useState('');

  const onSend = () => {
    if (!body.trim()) return;
    addMessage.mutate({ body: body.trim() }, { onSuccess: () => setBody('') });
  };

  if (isLoading) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center py-16"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Cargando ticket…
        </p>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center py-16"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            marginBottom: '4px',
          }}
        >
          Ticket no encontrado
        </p>
        <Link
          to="/dashboard/support"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-brand)',
          }}
        >
          Volver a Soporte
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="w-full max-w-2xl">
      <Link
        to="/dashboard/support"
        className="inline-block mb-3"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-brand)',
        }}
      >
        ← Volver a Soporte
      </Link>

      <h1
        className="text-[20px] lg:text-[24px]"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '4px',
        }}
      >
        {ticket.subject}
      </h1>
      <p
        className="text-[13px] mb-6"
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {TICKET_CATEGORY_LABELS[ticket.category]}
        {' · '}
        {TICKET_STATUS_LABELS[ticket.status]}
      </p>

      <div className="flex flex-col gap-3">
        {ticket.messages.map((message) => {
          const mine = message.author.kind === 'PROFESSIONAL';
          return (
            <div
              key={message.id}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: mine
                  ? 'var(--color-brand-surface)'
                  : 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                marginLeft: mine ? '10%' : 0,
                marginRight: mine ? 0 : '10%',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: mine ? 'var(--color-text-brand)' : 'var(--color-text-primary)',
                  }}
                >
                  {mine ? 'Tú' : 'Soporte Agendya'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {new Date(message.createdAt).toLocaleString('es-CO')}
                </span>
              </div>
              <p
                className="mt-1.5 whitespace-pre-wrap"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                }}
              >
                {message.body}
              </p>
            </div>
          );
        })}
      </div>

      {ticket.status !== 'CLOSED' && (
        <div
          className="rounded-2xl p-4 mt-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <textarea
            className="w-full rounded-lg p-3 text-sm"
            style={{
              fontFamily: 'var(--font-body)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
            rows={3}
            placeholder="Escribe tu respuesta…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          {addMessage.isError && (
            <p
              role="alert"
              className="mt-2 text-sm"
              style={{ fontFamily: 'var(--font-body)', color: '#DC2626' }}
            >
              {getApiErrorMessage(addMessage.error)}
            </p>
          )}
          <div className="flex justify-end mt-2">
            <button
              onClick={onSend}
              disabled={!body.trim() || addMessage.isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--color-brand-primary)',
                color: '#fff',
                border: 'none',
                cursor:
                  !body.trim() || addMessage.isPending ? 'not-allowed' : 'pointer',
                opacity: !body.trim() ? 0.6 : 1,
              }}
            >
              {addMessage.isPending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
