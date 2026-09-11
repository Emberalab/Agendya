/**
 * Tiny Spanish date labels for the agenda, replacing `date-fns/locale`'s `es`
 * bundle (~25 kB gzipped as its own chunk) on the `/dashboard/agenda` load
 * path. The agenda only needs two fixed formats and `CalendarGridView` already
 * hand-rolls the same month/day tables, so the locale's full CLDR data earned
 * its weight nowhere here.
 *
 * Output matches what `format(date, ..., { locale: es })` produced before:
 *  - `formatEsShort`      -> "jue, 10 sep"          (was 'EEE, d MMM')
 *  - `formatEsWeekdayLong`-> "jueves 10 de septiembre" (was "EEEE d 'de' MMMM")
 */

// Sunday-indexed, matching `Date.prototype.getDay()`.
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const WEEKDAYS_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatEsShort(date: Date): string {
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatEsWeekdayLong(date: Date): string {
  return `${WEEKDAYS_LONG[date.getDay()]} ${date.getDate()} de ${MONTHS_LONG[date.getMonth()]}`;
}
