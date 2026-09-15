import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProfessional360 } from './hooks/useProfessional360';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { TicketPriorityBadge, TicketStatusBadge } from '../shared/badges';

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
      {children}
    </h2>
  );
}

export function Professional360Page() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useProfessional360(id);

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-6 text-sm text-red-600 dark:text-red-400">
        No se pudo cargar este profesional.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {data.business.businessName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.account.email} · /{data.business.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data.account.isActive ? 'success' : 'danger'}>
            {data.account.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
          <Badge variant="secondary">{data.account.plan}</Badge>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle>Cuenta</SectionTitle>
          <dl className="space-y-1 text-sm">
            <Row label="Rol" value={data.account.role} />
            <Row label="Zona horaria" value={data.account.timezone} />
            <Row
              label="Miembro desde"
              value={new Date(data.account.createdAt).toLocaleDateString('es-CO')}
            />
            <Row
              label="Política de cancelación"
              value={`${data.business.cancellationPolicyHours} h`}
            />
          </dl>
        </Card>

        <Card>
          <SectionTitle>Citas</SectionTitle>
          <dl className="space-y-1 text-sm">
            <Row label="Completadas" value={data.appointments.counts.completed} />
            <Row label="Canceladas" value={data.appointments.counts.cancelled} />
            <Row label="No asistió" value={data.appointments.counts.noShow} />
            <Row label="Vencidas" value={data.appointments.counts.expired} />
          </dl>
        </Card>
      </div>

      <div className="mt-4">
        <SectionTitle>Próximas citas</SectionTitle>
        <Card padding="none">
          <BookingList
            items={data.appointments.upcoming}
            empty="Sin citas próximas."
          />
        </Card>
      </div>

      <div className="mt-4">
        <SectionTitle>Citas recientes</SectionTitle>
        <Card padding="none">
          <BookingList items={data.appointments.recent} empty="Sin citas recientes." />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <SectionTitle>Horario semanal</SectionTitle>
          <Card padding="sm">
            {data.schedule.workingHours.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sin horario configurado.
              </p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {data.schedule.workingHours.map((block) => (
                  <li key={block.id}>
                    {block.dayOfWeek} · {minutesToHm(block.startMinute)}–
                    {minutesToHm(block.endMinute)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div>
          <SectionTitle>Fechas bloqueadas próximas</SectionTitle>
          <Card padding="sm">
            {data.schedule.exceptions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ninguna.
              </p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {data.schedule.exceptions.map((exception) => (
                  <li key={exception.id}>
                    {exception.date}
                    {exception.reason ? ` — ${exception.reason}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <SectionTitle>Notificaciones recientes</SectionTitle>
        <Card padding="none">
          {data.notifications.recent.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              Sin notificaciones.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.notifications.recent.map((notification) => (
                <li key={notification.id} className="p-3">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {notification.body} ·{' '}
                    {new Date(notification.createdAt).toLocaleString('es-CO')}
                    {notification.readAt ? '' : ' · sin leer'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 mb-8">
        <SectionTitle>Tickets de soporte</SectionTitle>
        <Card padding="none">
          {[...data.support.open, ...data.support.resolved].length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              Sin tickets.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...data.support.open, ...data.support.resolved].map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    to={`/backoffice/tickets/${ticket.id}`}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <span className="truncate text-sm text-gray-900 dark:text-gray-100">
                      {ticket.subject}
                    </span>
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}

function minutesToHm(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function BookingList({
  items,
  empty,
}: {
  items: {
    id: string;
    serviceName: string;
    customerName: string;
    startAt: string;
    status: string;
    atHome: boolean;
  }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((booking) => (
        <li key={booking.id}>
          <Link
            to={`/backoffice/appointments/${booking.id}`}
            className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-gray-900 dark:text-gray-100">
                {booking.serviceName} — {booking.customerName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(booking.startAt).toLocaleString('es-CO')}
                {booking.atHome ? ' · a domicilio' : ''}
              </p>
            </div>
            <Badge variant="secondary" size="sm">
              {booking.status}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
