import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ACTIVITY_ACTORS,
  ACTIVITY_CATEGORIES,
  ACTIVITY_EVENT_CATEGORY,
  ACTIVITY_EVENT_TYPES,
  type ActivityActor,
  type ActivityCategory,
  type ActivityEvent,
  type ActivityEventType,
  type ActivityListParams,
  type ActivitySummary,
  type TrialStatus,
} from '@agendya/types';
import { useActivitySummary, useActivityTimeline } from './hooks/useActivity';
import {
  ACTOR_LABELS,
  CATEGORY_LABELS,
  TYPE_LABELS,
  dayKey,
  afterSignupLabel,
  calendarDaysBetween,
  describeEvent,
  eventLink,
  formatCalendarDate,
  formatDate,
  formatWeek,
  relativeDays,
  zonedStartOfDay,
  type EventTone,
} from './activityLabels';
import { Card } from '../../../shared/components/Card';
import { Badge, type BadgeVariant } from '../../../shared/components/Badge';
import { BackLink } from '../../../shared/components/BackLink';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';

type Period = 'trial' | 'all' | 'custom';

const TRIAL_STATUS_LABELS: Record<TrialStatus, string> = {
  ACTIVE: 'Prueba activa',
  ENDED: 'Prueba finalizada',
  NONE: 'Sin prueba',
};

const TRIAL_STATUS_VARIANTS: Record<TrialStatus, BadgeVariant> = {
  ACTIVE: 'success',
  ENDED: 'secondary',
  NONE: 'secondary',
};

const TRIAL_ACTION_LABELS = {
  GRANTED: 'Prueba otorgada',
  EXTENDED: 'Prueba extendida',
  ENDED: 'Prueba finalizada antes de tiempo',
} as const;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-sm font-semibold text-text-secondary">
      {children}
    </h2>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-muted" title={hint}>
        {label}
      </dt>
      <dd className="text-right font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className={ok ? 'text-success' : 'text-text-muted'}
      >
        {ok ? '✓' : '✕'}
      </span>
      <span className={ok ? 'text-text-primary' : 'text-text-muted'}>
        {label}
      </span>
      <span className="sr-only">{ok ? 'sí' : 'no'}</span>
    </li>
  );
}

export function ProfessionalActivityPage() {
  const { id = '' } = useParams();
  const { data: summary, isLoading, error } = useActivitySummary(id);

  if (isLoading) {
    return <div className="p-6 text-sm text-text-muted">Cargando…</div>;
  }
  if (error || !summary) {
    return (
      <div className="p-6">
        <BackLink to={`/backoffice/professionals/${id}`}>
          Volver al profesional
        </BackLink>
        <p className="text-sm text-danger">
          No se pudo cargar la actividad de este profesional.
        </p>
      </div>
    );
  }

  const { professional } = summary;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <BackLink to={`/backoffice/professionals/${id}`}>
        Volver al profesional
      </BackLink>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Actividad · {professional.businessName}
          </h1>
          <p className="text-sm text-text-muted">
            {professional.email} · /{professional.slug} ·{' '}
            {professional.timezone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={TRIAL_STATUS_VARIANTS[summary.trial.status]}>
            {TRIAL_STATUS_LABELS[summary.trial.status]}
          </Badge>
          <Badge variant="secondary" dot={false}>
            {professional.effectivePlan}
          </Badge>
        </div>
      </div>

      <SummarySection summary={summary} />
      <DailyStrip summary={summary} />
      <Timeline summary={summary} professionalId={id} />
    </div>
  );
}

function SummarySection({ summary }: { summary: ActivitySummary }) {
  const tz = summary.professional.timezone;
  const {
    trial,
    appointments,
    customers,
    configuration,
    usage,
    engagement,
    milestones,
  } = summary;
  const windowLabel =
    summary.window.basis === 'TRIAL'
      ? 'durante la prueba'
      : `últimos ${summary.engagement.windowDays} días (sin prueba)`;
  const afterSignup = (iso: string | null) =>
    iso
      ? `${formatDate(iso, tz)} · ${afterSignupLabel(calendarDaysBetween(milestones.accountCreatedAt, iso, tz))}`
      : 'Todavía no';

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle>Periodo de prueba</SectionTitle>
          {trial.status === 'NONE' ? (
            <p className="text-sm text-text-muted">
              Esta cuenta nunca tuvo un periodo de prueba.
            </p>
          ) : (
            <dl className="space-y-1 text-sm">
              <Row label="Estado" value={TRIAL_STATUS_LABELS[trial.status]} />
              <Row
                label="Inicio"
                value={trial.startedAt ? formatDate(trial.startedAt, tz) : '—'}
              />
              <Row
                label="Fin"
                value={trial.endsAt ? formatDate(trial.endsAt, tz) : '—'}
              />
              <Row label="Días restantes" value={trial.daysRemaining} />
              <Row
                label="Última actividad"
                value={
                  engagement.lastActivityAt
                    ? relativeDays(engagement.lastActivityAt)
                    : 'Sin actividad'
                }
              />
            </dl>
          )}
          {trial.history.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-text-muted">
              {trial.history.map((event) => (
                <li key={event.id}>
                  {TRIAL_ACTION_LABELS[event.action]} ·{' '}
                  {formatDate(event.createdAt, tz)} · {event.actorEmail}
                  {event.note ? ` — ${event.note}` : ''}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Compromiso</SectionTitle>
          <dl className="space-y-1 text-sm">
            <Row
              label="Primera actividad"
              value={
                engagement.firstActivityAt
                  ? formatDate(engagement.firstActivityAt, tz)
                  : '—'
              }
            />
            <Row
              label="Última actividad"
              value={
                engagement.lastActivityAt
                  ? formatDate(engagement.lastActivityAt, tz)
                  : '—'
              }
            />
            <Row
              label={`Días con actividad (${windowLabel})`}
              value={`${engagement.activeDays} de ${engagement.windowDays}`}
              hint="Días (zona horaria del profesional) con al menos una acción propia: abrir el panel, iniciar sesión, configurar o gestionar citas."
            />
            <Row
              label="Días desde la última actividad"
              value={engagement.daysSinceLastActivity ?? '—'}
            />
            <Row
              label="Última cita creada"
              value={
                engagement.lastBookingCreatedAt
                  ? formatDate(engagement.lastBookingCreatedAt, tz)
                  : '—'
              }
            />
          </dl>
        </Card>

        <Card>
          <SectionTitle>Citas ({windowLabel})</SectionTitle>
          <dl className="space-y-1 text-sm">
            <Row label="Total" value={appointments.total} />
            <Row
              label="En línea / manuales"
              value={`${appointments.online} / ${appointments.manual}`}
            />
            <Row label="Completadas" value={appointments.completed} />
            <Row label="Confirmadas" value={appointments.confirmed} />
            <Row label="Pendientes" value={appointments.pending} />
            <Row
              label="Canceladas"
              value={`${appointments.cancelled} (cliente ${appointments.cancelledByCustomer} · profesional ${appointments.cancelledByProfessional})`}
            />
            <Row
              label="Reprogramadas"
              value={`${appointments.rescheduled} (${appointments.rescheduleEvents} cambios)`}
              hint="Citas con al menos una reprogramación registrada en el periodo."
            />
            <Row label="No asistió" value={appointments.noShow} />
            <Row label="Vencidas sin cerrar" value={appointments.expired} />
            <Row
              label="Clientes distintos"
              value={`${customers.distinct} (${customers.returning} repiten)`}
              hint="Contados por número de teléfono de la reserva."
            />
          </dl>
        </Card>

        <Card>
          <SectionTitle>Configuración actual</SectionTitle>
          <ul className="space-y-1">
            <Check ok={configuration.profile.hasCategory} label="Categoría" />
            <Check
              ok={configuration.profile.hasDescription}
              label="Descripción"
            />
            <Check
              ok={configuration.profile.hasLogoOrPhoto}
              label="Logo o foto"
            />
            <Check
              ok={configuration.profile.hasCoverImage}
              label="Imagen de portada"
            />
            <Check
              ok={configuration.services.total > 0}
              label={`Servicios: ${configuration.services.active} activos de ${configuration.services.total}${configuration.services.planLocked ? ` · ${configuration.services.planLocked} bloqueados por plan` : ''}`}
            />
            <Check
              ok={configuration.schedule.workingDays > 0}
              label={`Horario: ${configuration.schedule.workingDays} días · ${configuration.schedule.timeBlocks} bloques`}
            />
          </ul>
          {configuration.schedule.days.length > 0 && (
            <ul className="mt-2 space-y-0.5 pl-6 text-xs text-text-muted">
              {formatWeek(configuration.schedule.days).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <Row
              label="Fechas bloqueadas próximas"
              value={configuration.schedule.upcomingBlockedDates}
            />
            <Row
              label="Dispositivos con push"
              value={configuration.pushDevices}
            />
          </dl>
        </Card>

        <Card>
          <SectionTitle>Primeros pasos</SectionTitle>
          <dl className="space-y-1 text-sm">
            <Row
              label="Cuenta creada"
              value={formatDate(milestones.accountCreatedAt, tz)}
            />
            <Row
              label="Primer servicio"
              value={afterSignup(milestones.firstServiceAt)}
            />
            <Row
              label="Horario guardado"
              value={afterSignup(milestones.firstScheduleAt)}
            />
            <Row
              label="Primera cita"
              value={afterSignup(milestones.firstBookingAt)}
            />
            <Row
              label="Primera cita manual"
              value={afterSignup(milestones.firstManualBookingAt)}
            />
          </dl>
        </Card>

        <Card>
          <SectionTitle>Uso ({windowLabel})</SectionTitle>
          <dl className="space-y-1 text-sm">
            <Row
              label="Servicios creados / editados / eliminados"
              value={`${usage.servicesCreated} / ${usage.servicesUpdated} / ${usage.servicesDeleted}`}
            />
            <Row label="Cambios de horario" value={usage.scheduleChanges} />
            <Row label="Fechas bloqueadas" value={usage.blockedDatesCreated} />
            <Row label="Cambios de perfil" value={usage.profileUpdates} />
            <Row
              label="Notificaciones leídas"
              value={`${usage.notificationsRead} de ${usage.notificationsReceived}`}
            />
            <Row
              label="Tickets de soporte abiertos"
              value={usage.supportTicketsOpened}
            />
          </dl>
        </Card>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        {summary.trackedSince
          ? `Registro detallado desde el ${formatDate(summary.trackedSince, tz)}. `
          : 'Todavía no hay actividad registrada en vivo para esta cuenta. '}
        Lo anterior se reconstruyó solo a partir de datos existentes (marcado
        «reconstruido»): reprogramaciones, ediciones, inicios de sesión y
        visitas previos no quedaron guardados.
      </p>
    </>
  );
}

function DailyStrip({ summary }: { summary: ActivitySummary }) {
  const max = Math.max(
    1,
    ...summary.daily.map((day) => day.professionalEvents),
  );
  return (
    <div className="mt-6">
      <SectionTitle>Actividad diaria</SectionTitle>
      <Card padding="sm">
        <div
          className="flex flex-wrap gap-1"
          role="list"
          aria-label="Actividad por día"
        >
          {summary.daily.map((day) => {
            const intensity = day.professionalEvents / max;
            const label = `${formatCalendarDate(day.date)}: ${day.professionalEvents} acciones del profesional · ${day.bookingsCreated} citas creadas`;
            return (
              <div
                key={day.date}
                role="listitem"
                title={label}
                aria-label={label}
                className="relative size-5 rounded border border-border"
                style={{
                  backgroundColor:
                    day.professionalEvents > 0
                      ? `color-mix(in srgb, var(--color-brand-primary) ${Math.round(25 + intensity * 75)}%, transparent)`
                      : 'var(--color-surface-soft)',
                }}
              >
                {day.bookingsCreated > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0.5 bottom-0.5 size-1.5 rounded-full bg-success"
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Color: acciones del profesional ese día · punto verde: se creó al
          menos una cita.
        </p>
      </Card>
    </div>
  );
}

const TONE_CLASSES: Record<EventTone, { icon: string; className: string }> = {
  success: {
    icon: '✓',
    className: 'bg-success-surface text-success border-success-border',
  },
  warning: {
    icon: '↻',
    className: 'bg-warning-surface text-warning border-warning-border',
  },
  danger: {
    icon: '✕',
    className: 'bg-danger-surface text-danger border-danger-border',
  },
  neutral: {
    icon: '•',
    className: 'bg-surface-soft text-text-muted border-border',
  },
};

function Timeline({
  summary,
  professionalId,
}: {
  summary: ActivitySummary;
  professionalId: string;
}) {
  const tz = summary.professional.timezone;
  const hasTrial = summary.trial.status !== 'NONE';
  const [period, setPeriod] = useState<Period>(hasTrial ? 'trial' : 'all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [category, setCategory] = useState<ActivityCategory | ''>('');
  const [type, setType] = useState<ActivityEventType | ''>('');
  const [actor, setActor] = useState<ActivityActor | ''>('');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [entityId, setEntityId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const filters = useMemo<Omit<ActivityListParams, 'cursor'>>(() => {
    const next: Omit<ActivityListParams, 'cursor'> = { order, limit: 30 };
    if (period === 'trial') next.trialOnly = 'true';
    if (period === 'custom') {
      if (fromDate) next.from = zonedStartOfDay(fromDate, tz).toISOString();
      if (toDate) {
        const nextDay = new Date(`${toDate}T12:00:00.000Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        next.to = new Date(
          zonedStartOfDay(nextDay.toISOString().slice(0, 10), tz).getTime() - 1,
        ).toISOString();
      }
    }
    if (category) next.category = category;
    if (type) next.type = type;
    if (actor) next.actor = actor;
    if (entityId) next.entityId = entityId;
    if (search) next.search = search;
    return next;
  }, [
    period,
    fromDate,
    toDate,
    category,
    type,
    actor,
    order,
    entityId,
    search,
    tz,
  ]);

  // A booking's full history, whatever the other filters were.
  const showBookingHistory = (bookingId: string) => {
    setEntityId(bookingId);
    setPeriod('all');
    setCategory('');
    setType('');
    setActor('');
    setSearchInput('');
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityTimeline(professionalId, filters);
  const events = data?.pages.flatMap((page) => page.items) ?? [];
  const typeOptions = ACTIVITY_EVENT_TYPES.filter(
    (t) => !category || ACTIVITY_EVENT_CATEGORY[t] === category,
  );

  // Group consecutive events by the professional's local calendar day.
  const groups: { day: string; items: ActivityEvent[] }[] = [];
  for (const event of events) {
    const day = dayKey(event.occurredAt, tz);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(event);
    else groups.push({ day, items: [event] });
  }

  return (
    <div className="mt-6 mb-8">
      <SectionTitle>
        {period === 'trial' ? 'Actividad durante la prueba' : 'Línea de tiempo'}
      </SectionTitle>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-56">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            aria-label="Periodo"
          >
            {hasTrial && <option value="trial">Solo periodo de prueba</option>}
            <option value="all">Todo el historial</option>
            <option value="custom">Rango de fechas…</option>
          </Select>
        </div>
        {period === 'custom' && (
          <>
            <div className="w-40">
              <Input
                type="date"
                aria-label="Desde"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Input
                type="date"
                aria-label="Hasta"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </>
        )}
        <div className="w-full sm:w-52">
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ActivityCategory | '');
              setType('');
            }}
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityEventType | '')}
            aria-label="Tipo de evento"
          >
            <option value="">Todos los eventos</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
          <Select
            value={actor}
            onChange={(e) => setActor(e.target.value as ActivityActor | '')}
            aria-label="Quién"
          >
            <option value="">Cualquiera</option>
            {ACTIVITY_ACTORS.map((a) => (
              <option key={a} value={a}>
                {ACTOR_LABELS[a]}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
          <Select
            value={order}
            onChange={(e) => setOrder(e.target.value as 'desc' | 'asc')}
            aria-label="Orden"
          >
            <option value="desc">Más recientes</option>
            <option value="asc">Más antiguos</option>
          </Select>
        </div>
        <div className="min-w-48 flex-1">
          <Input
            placeholder="Buscar servicio o fecha…"
            aria-label="Buscar en la actividad"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {entityId && (
        <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
          <span>Mostrando solo el historial de una cita.</span>
          <button
            type="button"
            onClick={() => setEntityId(null)}
            className="font-semibold text-text-brand hover:underline"
          >
            Quitar filtro
          </button>
        </div>
      )}

      <Card className="mt-3" padding="none">
        {isLoading && <p className="p-4 text-sm text-text-muted">Cargando…</p>}
        {isError && (
          <p className="p-4 text-sm text-danger">
            No se pudo cargar la actividad.
          </p>
        )}
        {!isLoading && !isError && events.length === 0 && (
          <p className="p-4 text-sm text-text-muted">
            Sin actividad para estos filtros.
          </p>
        )}
        {groups.map((group) => (
          <section key={group.day} aria-label={formatCalendarDate(group.day)}>
            <h3 className="border-b border-border bg-surface-soft px-4 py-1.5 text-xs font-semibold text-text-muted uppercase">
              {formatCalendarDate(group.day)}
            </h3>
            <ul className="divide-y divide-border">
              {group.items.map((event) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  timeZone={tz}
                  onOnlyThisBooking={showBookingHistory}
                />
              ))}
            </ul>
          </section>
        ))}
      </Card>

      {hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      )}
    </div>
  );
}

function TimelineItem({
  event,
  timeZone,
  onOnlyThisBooking,
}: {
  event: ActivityEvent;
  timeZone: string;
  onOnlyThisBooking: (id: string) => void;
}) {
  const { title, details, tone } = describeEvent(event, timeZone);
  const toneStyle = TONE_CLASSES[tone];
  const link = eventLink(event);
  const time = new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(event.occurredAt));

  return (
    <li className="flex items-start gap-3 p-3" data-testid="activity-event">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${toneStyle.className}`}
      >
        {toneStyle.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {details.map((line) => (
          <p key={line} className="text-xs text-text-muted">
            {line}
          </p>
        ))}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span>{time}</span>
          <Badge variant="secondary" size="sm" dot={false}>
            {ACTOR_LABELS[event.actor]}
          </Badge>
          {event.backfilled && (
            <Badge variant="warning" size="sm" dot={false}>
              reconstruido
            </Badge>
          )}
          {link && (
            <>
              <Link
                to={link}
                className="font-semibold text-text-brand hover:underline"
              >
                Ver cita
              </Link>
              {event.entityId && (
                <button
                  type="button"
                  onClick={() => onOnlyThisBooking(event.entityId!)}
                  className="font-semibold text-text-brand hover:underline"
                >
                  Historial de esta cita
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}
