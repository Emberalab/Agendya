/** Formats integer minor units (COP cents) as e.g. `$20.000`. */
export function formatCOP(cents: number): string {
  const pesos = Math.round(cents / 100);
  return `$${pesos.toLocaleString('es-CO')}`;
}

/** Compact duration, e.g. `40 min`, `1h 30min`, `2h`. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Verbose duration for select options, e.g. `40 min`, `1 hora`, `1 hora 30 min`. */
export function formatDurationLong(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(h === 1 ? '1 hora' : `${h} horas`);
  if (m > 0) parts.push(`${m} min`);
  return parts.join(' ') || '0 min';
}
