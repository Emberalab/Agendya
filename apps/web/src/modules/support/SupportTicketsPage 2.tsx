import { useNavigate } from 'react-router-dom';
import type { SupportTicketSummary, TicketStatus } from '@agendya/types';
import { useMyTickets } from './hooks/useMyTickets';
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from './labels';

const STATUS_COLORS: Record<TicketStatus, { bg: string; fg: string }> = {
  OPEN: { bg: '#FEF2F2', fg: '#DC2626' },
  IN_PROGRESS: { bg: '#EFF6FF', fg: '#2563EB' },
  WAITING_FOR_CUSTOMER: { bg: '#FFFBEB', fg: '#D97706' },
  RESOLVED: { bg: '#F0FDF4', fg: '#16A34A' },
  CLOSED: { bg: '#F1F5F9', fg: '#64748B' },
};

function StatusPill({ status }: { status: TicketStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicketSummary }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/dashboard/support/${ticket.id}`)}
      className="w-full text-left rounded-2xl p-4 lg:p-5 flex items-center justify-between gap-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
      }}
    >
      <div className="min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {ticket.subject}
        </p>
        <p
          className="mt-1"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}
        >
          {TICKET_CATEGORY_LABELS[ticket.category]}
          {' · '}
          {ticket.messageCount} {ticket.messageCount === 1 ? 'mensaje' : 'mensajes'}
          {' · '}
          Actualizado {new Date(ticket.updatedAt).toLocaleDateString('es-CO')}
        </p>
      </div>
      <StatusPill status={ticket.status} />
    </button>
  );
}

export function SupportTicketsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isRefetching } = useMyTickets();
  const tickets = data?.items ?? [];

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-[24px] lg:text-[28px]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            Soporte
          </h1>
          <p
            className="text-[13px] lg:text-sm"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Tus tickets con el equipo de Agendya.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/support/new')}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            fontFamily: 'var(--font-body)',
            backgroundColor: 'var(--color-brand-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2v10M2 7h10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          Nuevo ticket
        </button>
      </div>

      {isLoading && (
        <div
          className="rounded-2xl flex items-center justify-center py-16"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Cargando tickets…
          </p>
        </div>
      )}

      {!isLoading && isError && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 px-6"
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
            No pudimos cargar tus tickets
          </p>
          <button
            onClick={() => void refetch()}
            disabled={isRefetching}
            className="mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              border: '1px solid var(--color-border)',
              background: 'none',
              color: 'var(--color-text-primary)',
              cursor: isRefetching ? 'not-allowed' : 'pointer',
            }}
          >
            {isRefetching ? 'Reintentando…' : 'Reintentar'}
          </button>
        </div>
      )}

      {!isLoading && !isError && tickets.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 px-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '18px',
              color: 'var(--color-text-primary)',
              marginBottom: '6px',
            }}
          >
            Aún no tienes tickets
          </h2>
          <p
            className="text-center max-w-md"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              lineHeight: '1.55',
              marginBottom: '18px',
            }}
          >
            Si algo no funciona como esperabas o tienes una pregunta, cuéntanos
            y te ayudamos.
          </p>
          <button
            onClick={() => navigate('/dashboard/support/new')}
            className="px-5 py-3 rounded-xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Crear mi primer ticket
          </button>
        </div>
      )}

      {!isLoading && !isError && tickets.length > 0 && (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
