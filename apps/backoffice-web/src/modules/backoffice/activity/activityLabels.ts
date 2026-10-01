import type {
  ActivityActor,
  ActivityCategory,
  ActivityEvent,
  ActivityEventType,
  Weekday,
  WorkingDaySummary,
} from '@agendya/types';

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  ACCOUNT: 'Cuenta y acceso',
  CONFIGURATION: 'Perfil',
  SERVICE: 'Servicios',
  SCHEDULE: 'Horario',
  APPOINTMENT: 'Citas',
  NOTIFICATION: 'Notificaciones',
};

export const TYPE_LABELS: Record<ActivityEventType, string> = {
  ACCOUNT_CREATED: 'Cuenta creada',
  LOGGED_IN: 'Inicio de sesión',
  PASSWORD_RESET: 'Contraseña restablecida',
  DASHBOARD_VISITED: 'Abrió el panel',
  PROFILE_UPDATED: 'Perfil actualizado',
  SERVICE_CREATED: 'Servicio creado',
  SERVICE_UPDATED: 'Servicio editado',
  SERVICE_DELETED: 'Servicio eliminado',
  WORKING_HOURS_UPDATED: 'Horario guardado',
  SCHEDULE_EXCEPTION_CREATED: 'Fecha bloqueada',
  SCHEDULE_EXCEPTION_DELETED: 'Fecha desbloqueada',
  BOOKING_CREATED: 'Cita creada',
  BOOKING_UPDATED: 'Cita modificada',
  BOOKING_RESCHEDULED: 'Cita reprogramada',
  BOOKING_CANCELLED: 'Cita cancelada',
  BOOKING_COMPLETED: 'Cita completada',
  PUSH_ENABLED: 'Push activado',
  PUSH_DISABLED: 'Push desactivado',
};

export const ACTOR_LABELS: Record<ActivityActor, string> = {
  PROFESSIONAL: 'Profesional',
  CUSTOMER: 'Cliente',
  SYSTEM: 'Sistema',
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  SUNDAY: 'Domingo',
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
};

const PROFILE_FIELD_LABELS: Record<string, string> = {
  businessName: 'Nombre del negocio',
  slug: 'Enlace público',
  category: 'Categoría',
  description: 'Descripción',
  photoUrl: 'Foto',
  logoUrl: 'Logo',
  coverImageUrl: 'Portada',
  brandColor: 'Color de marca',
  timezone: 'Zona horaria',
  cancellationPolicyHours: 'Política de cancelación',
};

const SERVICE_FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripción',
  durationMinutes: 'Duración',
  priceCents: 'Precio',
  isActive: 'Activo',
  homeServiceEnabled: 'A domicilio',
  homeDurationMinutes: 'Duración a domicilio',
  homePriceCents: 'Precio a domicilio',
};

/** `$20.000` from COP cents — same format as apps/web's `formatCOP`. */
export function formatCOP(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('es-CO')}`;
}

export function minutesToHm(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Date + time in the professional's time zone, e.g. `17 sept, 10:00`. */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

/** Date only (no time), in the professional's time zone. */
export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso));
}

/** A calendar date (`YYYY-MM-DD`), which has no time zone of its own. */
export function formatCalendarDate(date: string): string {
  return formatDate(`${date}T12:00:00.000Z`, 'UTC');
}

/** Local calendar day key (`YYYY-MM-DD`) used to group the timeline. */
export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** `Lunes 08:00–12:00, 14:00–18:00`, one entry per configured day. */
export function formatWeek(days: WorkingDaySummary[]): string[] {
  return days.map(
    (day) =>
      `${WEEKDAY_LABELS[day.dayOfWeek]} ${day.blocks
        .map(([start, end]) => `${minutesToHm(start)}–${minutesToHm(end)}`)
        .join(', ')}`,
  );
}

export type EventTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface EventDescription {
  title: string;
  details: string[];
  tone: EventTone;
}

type Change = { from: unknown; to: unknown } | { changed: true };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  if (typeof value === 'number') {
    if (field.endsWith('PriceCents') || field === 'priceCents')
      return formatCOP(value);
    if (field.endsWith('Minutes')) return `${value} min`;
    if (field === 'cancellationPolicyHours') return `${value} h`;
  }
  return String(value);
}

function describeChanges(
  changes: unknown,
  labels: Record<string, string>,
): string[] {
  return Object.entries(asRecord(changes) as Record<string, Change>).map(
    ([field, change]) => {
      const label = labels[field] ?? field;
      if ('changed' in change) return `${label} actualizado`;
      return `${label}: ${formatFieldValue(field, change.from)} → ${formatFieldValue(field, change.to)}`;
    },
  );
}

function isWeek(value: unknown): value is WorkingDaySummary[] {
  return Array.isArray(value);
}

/**
 * Human-readable line for one timeline event. Only reads the safe metadata
 * the API records; anything missing (e.g. on reconstructed events) is just
 * left out rather than guessed.
 */
export function describeEvent(
  event: ActivityEvent,
  timeZone: string,
): EventDescription {
  const meta = asRecord(event.metadata);
  const subject = event.subject ?? str(meta.serviceName) ?? str(meta.name);
  const slot = str(meta.startAt)
    ? formatDateTime(meta.startAt as string, timeZone)
    : null;

  switch (event.type) {
    case 'ACCOUNT_CREATED':
      return {
        title:
          meta.method === 'google'
            ? 'Cuenta creada con Google'
            : 'Cuenta creada',
        details: [],
        tone: 'success',
      };
    case 'LOGGED_IN':
      return {
        title:
          meta.method === 'google'
            ? 'Inició sesión con Google'
            : 'Inició sesión',
        details: [],
        tone: 'neutral',
      };
    case 'PASSWORD_RESET':
      return {
        title: 'Restableció su contraseña',
        details: [],
        tone: 'neutral',
      };
    case 'DASHBOARD_VISITED':
      return { title: 'Abrió el panel', details: [], tone: 'neutral' };
    case 'PROFILE_UPDATED':
      return {
        title: 'Actualizó su perfil',
        details: describeChanges(meta.changes, PROFILE_FIELD_LABELS),
        tone: 'neutral',
      };
    case 'SERVICE_CREATED': {
      const details: string[] = [];
      if (
        typeof meta.durationMinutes === 'number' &&
        typeof meta.priceCents === 'number'
      ) {
        details.push(
          `${meta.durationMinutes} min · ${formatCOP(meta.priceCents)}`,
        );
      }
      if (meta.homeServiceEnabled === true)
        details.push('Ofrece servicio a domicilio');
      if (meta.duplicatedFromId) details.push('Duplicado de otro servicio');
      return {
        title: `Servicio "${subject ?? '—'}" creado`,
        details,
        tone: 'success',
      };
    }
    case 'SERVICE_UPDATED': {
      const changes = asRecord(meta.changes) as Record<string, Change>;
      const onlyActive =
        Object.keys(changes).length === 1 && 'isActive' in changes;
      if (onlyActive && 'to' in changes.isActive) {
        const activated = changes.isActive.to === true;
        return {
          title: `Servicio "${subject ?? '—'}" ${activated ? 'activado' : 'desactivado'}`,
          details: [],
          tone: activated ? 'success' : 'warning',
        };
      }
      return {
        title: `Servicio "${subject ?? '—'}" editado`,
        details: describeChanges(changes, SERVICE_FIELD_LABELS),
        tone: 'neutral',
      };
    }
    case 'SERVICE_DELETED':
      return {
        title: `Servicio "${subject ?? '—'}" eliminado`,
        details: [],
        tone: 'danger',
      };
    case 'WORKING_HOURS_UPDATED': {
      const after = isWeek(meta.after) ? meta.after : [];
      const before = meta.before;
      const title =
        before === null || before === undefined
          ? 'Horario semanal vigente'
          : isWeek(before) && before.length === 0
            ? 'Configuró su horario'
            : after.length === 0
              ? 'Vació su horario'
              : 'Actualizó su horario';
      return {
        title,
        details: after.length ? formatWeek(after) : ['Sin días de atención'],
        tone:
          after.length === 0
            ? 'warning'
            : isWeek(before) && before.length === 0
              ? 'success'
              : 'neutral',
      };
    }
    case 'SCHEDULE_EXCEPTION_CREATED': {
      const date = str(meta.date) ?? subject;
      const details: string[] = [];
      if (str(meta.reason)) details.push(`Motivo: ${meta.reason as string}`);
      if (
        typeof meta.affectedBookingsCount === 'number' &&
        meta.affectedBookingsCount > 0
      ) {
        details.push(`Ya tenía ${meta.affectedBookingsCount} cita(s) ese día`);
      }
      return {
        title: `Bloqueó el ${date ? formatCalendarDate(date) : '—'}`,
        details,
        tone: 'warning',
      };
    }
    case 'SCHEDULE_EXCEPTION_DELETED': {
      const date = str(meta.date) ?? subject;
      return {
        title: `Desbloqueó el ${date ? formatCalendarDate(date) : '—'}`,
        details: [],
        tone: 'neutral',
      };
    }
    case 'BOOKING_CREATED':
      return {
        title:
          meta.source === 'MANUAL'
            ? 'Creó una cita manualmente'
            : 'Recibió una cita en línea',
        details: [
          [subject, slot].filter(Boolean).join(' · '),
          ...(meta.atHome === true ? ['A domicilio'] : []),
        ].filter(Boolean),
        tone: 'success',
      };
    case 'BOOKING_UPDATED':
      return {
        title: 'Cita modificada',
        details: [
          str(meta.previousServiceName)
            ? `Servicio: ${meta.previousServiceName as string} → ${subject ?? '—'}`
            : 'Cambió los datos de contacto o la modalidad',
        ],
        tone: 'neutral',
      };
    case 'BOOKING_RESCHEDULED':
      return {
        title: 'Cita reprogramada',
        details: [
          [
            subject,
            str(meta.from) && str(meta.to)
              ? `${formatDateTime(meta.from as string, timeZone)} → ${formatDateTime(meta.to as string, timeZone)}`
              : null,
          ]
            .filter(Boolean)
            .join(' · '),
        ].filter(Boolean),
        tone: 'warning',
      };
    case 'BOOKING_CANCELLED':
      return {
        title: 'Cita cancelada',
        details: [[subject, slot].filter(Boolean).join(' · ')].filter(Boolean),
        tone: 'danger',
      };
    case 'BOOKING_COMPLETED':
      return {
        title: 'Cita completada',
        details: [[subject, slot].filter(Boolean).join(' · ')].filter(Boolean),
        tone: 'success',
      };
    case 'PUSH_ENABLED':
      return {
        title: 'Activó las notificaciones push',
        details: [],
        tone: 'success',
      };
    case 'PUSH_DISABLED':
      return {
        title: 'Desactivó las notificaciones push',
        details: [],
        tone: 'neutral',
      };
  }
}

/** Link target for events about an appointment, else null. */
export function eventLink(event: ActivityEvent): string | null {
  return event.entityType === 'Booking' && event.entityId
    ? `/backoffice/appointments/${event.entityId}`
    : null;
}

/**
 * Instant at which calendar `date` (`YYYY-MM-DD`) starts in `timeZone`, so a
 * date filter means the professional's day, not the browser's or UTC's.
 */
export function zonedStartOfDay(date: string, timeZone: string): Date {
  const guess = new Date(`${date}T00:00:00.000Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(guess);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return new Date(guess.getTime() - (wallClockAsUtc - guess.getTime()));
}

/** `hoy`, `ayer`, `hace 5 días`. */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const days = Math.floor(
    (now.getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

/**
 * Calendar days between two instants in the professional's time zone
 * (Sep 14 23:00 → Sep 15 08:00 is 1 day), for "N días después del registro".
 */
export function calendarDaysBetween(
  fromIso: string,
  toIso: string,
  timeZone: string,
): number {
  const from = Date.parse(`${dayKey(fromIso, timeZone)}T00:00:00Z`);
  const to = Date.parse(`${dayKey(toIso, timeZone)}T00:00:00Z`);
  return Math.max(0, Math.round((to - from) / (24 * 60 * 60 * 1000)));
}

/** `el mismo día del registro`, `1 día después del registro`, `N días después…`. */
export function afterSignupLabel(days: number): string {
  if (days === 0) return 'el mismo día del registro';
  return `${days} ${days === 1 ? 'día' : 'días'} después del registro`;
}
