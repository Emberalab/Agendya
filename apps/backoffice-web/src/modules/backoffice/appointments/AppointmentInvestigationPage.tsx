import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppointmentInvestigation } from './hooks/useAppointmentInvestigation';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { TicketPriorityBadge, TicketStatusBadge } from '../shared/badges';

// This page is reached both from a professional's 360 view and from a
// ticket's "Ver cita relacionada" link — there's no single canonical parent
// list, so "back" means the actual browser history entry rather than a
// fixed `<Link>`, unlike TicketDetailPage/Professional360Page.
function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-3 inline-block text-sm font-semibold text-text-brand hover:underline"
    >
      ← Volver
    </button>
  );
}

export function AppointmentInvestigationPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useAppointmentInvestigation(id);

  if (isLoading) {
    return <div className="p-6 text-sm text-text-muted">Cargando…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-6">
        <BackButton />
        <p className="text-sm text-danger">No se pudo cargar esta cita.</p>
      </div>
    );
  }

  const { booking } = data;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <BackButton />

      <p className="text-xs text-text-muted">
        <Link to={`/backoffice/professionals/${data.professional.id}`} className="hover:underline">
          {data.professional.businessName}
        </Link>
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">
          {booking.serviceNameSnapshot} — {booking.customerName}
        </h1>
        <Badge variant="secondary" dot={false}>
          {booking.status}
        </Badge>
      </div>

      <Card className="mt-4">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Cliente" value={`${booking.customerName} · ${booking.customerEmail}`} />
          <Row label="Teléfono" value={booking.customerPhone} />
          <Row label="Inicio" value={new Date(booking.startAt).toLocaleString('es-CO')} />
          <Row label="Fin" value={new Date(booking.endAt).toLocaleString('es-CO')} />
          <Row label="Duración" value={`${booking.durationMinutesSnapshot} min`} />
          <Row label="Modalidad" value={booking.atHome ? 'A domicilio' : 'En local'} />
          {booking.atHome && booking.customerAddress && <Row label="Dirección" value={booking.customerAddress} />}
          <Row label="Creada" value={new Date(booking.createdAt).toLocaleString('es-CO')} />
          {booking.cancelledAt && (
            <>
              <Row label="Cancelada" value={new Date(booking.cancelledAt).toLocaleString('es-CO')} />
              <Row label="Cancelada por" value={booking.cancelledBy ?? '—'} />
            </>
          )}
          <Row label="Recordatorio 24h" value={booking.reminder24hSentAt ? 'Enviado' : 'No enviado'} />
          <Row label="Recordatorio 2h" value={booking.reminder2hSentAt ? 'Enviado' : 'No enviado'} />
        </dl>
      </Card>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-text-secondary">Horario configurado ese día</h2>
      <Card padding="sm">
        {data.workingHoursThatDay.length === 0 ? (
          <p className="text-sm text-text-muted">
            No hay horario configurado para ese día de la semana — esto puede explicar por qué no se pudo reservar o por qué la
            cita cae fuera de horario.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-text-secondary">
            {data.workingHoursThatDay.map((block) => (
              <li key={block.id}>
                {block.dayOfWeek} · {Math.floor(block.startMinute / 60)}:{String(block.startMinute % 60).padStart(2, '0')}–
                {Math.floor(block.endMinute / 60)}:{String(block.endMinute % 60).padStart(2, '0')}
              </li>
            ))}
          </ul>
        )}
        {data.scheduleException && (
          <p className="mt-2 text-sm text-warning">
            Esta fecha está marcada como bloqueada
            {data.scheduleException.reason ? `: ${data.scheduleException.reason}` : '.'}
          </p>
        )}
      </Card>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-text-secondary">Notificaciones relacionadas</h2>
      <Card padding="none">
        {data.relatedNotifications.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">
            No se registró ninguna notificación para esta cita — si el profesional dice no haber sido avisado, este es el
            primer punto a revisar.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.relatedNotifications.map((notification) => (
              <li key={notification.id} className="p-3 text-sm">
                <p className="text-text-primary">{notification.title}</p>
                <p className="text-xs text-text-muted">
                  {new Date(notification.createdAt).toLocaleString('es-CO')}
                  {notification.readAt ? ' · leída' : ' · sin leer'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-text-secondary">Tickets relacionados</h2>
      <Card padding="none">
        {data.relatedTickets.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">Ningún ticket referencia esta cita.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.relatedTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to={`/backoffice/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-surface-soft"
                >
                  <span className="truncate text-sm text-text-primary">{ticket.subject}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <TicketPriorityBadge priority={ticket.priority} />
                    <TicketStatusBadge status={ticket.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-medium text-text-primary">{value}</dd>
    </div>
  );
}
