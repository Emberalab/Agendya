import type { Weekday } from '@agendya/types';

/** Weekdays in the order shown in the editor (Monday first). */
export const WEEK_ORDER: readonly Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

export const WEEKDAY_SLUGS: Record<Weekday, string> = {
  MONDAY: 'lunes',
  TUESDAY: 'martes',
  WEDNESDAY: 'miercoles',
  THURSDAY: 'jueves',
  FRIDAY: 'viernes',
  SATURDAY: 'sabado',
  SUNDAY: 'domingo',
};

const SLUG_TO_WEEKDAY: Record<string, Weekday> = Object.fromEntries(
  Object.entries(WEEKDAY_SLUGS).map(([weekday, slug]) => [slug, weekday]),
) as Record<string, Weekday>;

export function slugToWeekday(slug: string | undefined): Weekday | null {
  if (!slug) return null;
  return SLUG_TO_WEEKDAY[slug.toLowerCase()] ?? null;
}
