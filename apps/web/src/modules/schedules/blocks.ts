import type { Weekday, WorkingHour } from '@agendya/types';
import { minutesToTimeString } from './time.util';
import { WEEK_ORDER } from './weekday';

export interface Block {
  startMinute: number;
  endMinute: number;
}

/** Groups the flat working-hours list into ordered blocks per weekday. */
export function groupByDay(hours: WorkingHour[]): Record<Weekday, Block[]> {
  const grouped = Object.fromEntries(
    WEEK_ORDER.map((day) => [day, [] as Block[]]),
  ) as Record<Weekday, Block[]>;

  for (const hour of hours) {
    grouped[hour.dayOfWeek].push({
      startMinute: hour.startMinute,
      endMinute: hour.endMinute,
    });
  }

  for (const day of WEEK_ORDER) {
    grouped[day].sort((a, b) => a.startMinute - b.startMinute);
  }

  return grouped;
}

/** Flattens the per-day map back into the `setWorkingHours` payload. */
export function toDaysPayload(
  byDay: Record<Weekday, Block[]>,
): { dayOfWeek: Weekday; startMinute: number; endMinute: number }[] {
  return WEEK_ORDER.flatMap((day) =>
    byDay[day].map((block) => ({
      dayOfWeek: day,
      startMinute: block.startMinute,
      endMinute: block.endMinute,
    })),
  );
}

/** `09:00 – 13:00` */
export function formatRange(block: Block): string {
  return `${minutesToTimeString(block.startMinute)} – ${minutesToTimeString(
    block.endMinute,
  )}`;
}

/** `4h`, `3h 30m`, `45m` */
export function formatBlockDuration(block: Block): string {
  const total = block.endMinute - block.startMinute;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Time-of-day label for a block, based on its start time: `Mañana` / `Tarde` / `Noche`. */
export function dayPartLabel(block: Block): string {
  if (block.startMinute < 12 * 60) return 'Mañana';
  if (block.startMinute < 18 * 60) return 'Tarde';
  return 'Noche';
}

export function blocksOverlap(a: Block, b: Block): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/** First block in `others` that overlaps `candidate`, or null. */
export function findOverlap(candidate: Block, others: Block[]): Block | null {
  return others.find((other) => blocksOverlap(candidate, other)) ?? null;
}
