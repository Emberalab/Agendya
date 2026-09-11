import type { Weekday, WorkingHour } from '@agendya/types';
import { minutesToTimeString } from './time.util';
import { WEEK_ORDER } from './weekday';

export interface Block {
  /**
   * Stable client-side identity: the server's `WorkingHour.id` for a block
   * that came from a saved record, or a fresh client-generated id (see
   * `newBlockId`) for one just added locally and not yet persisted. Never
   * sent to the backend — `toDaysPayload` strips it, since the API has no
   * per-block identity of its own (`setWorkingHours` replaces the whole week
   * every save, see SchedulesService). It exists purely so the UI can target
   * "this exact block" for edit/remove instead of relying on its position in
   * an array that gets re-sorted and re-indexed as blocks are added, edited
   * or removed.
   */
  id: string;
  startMinute: number;
  endMinute: number;
}

/** Fresh id for a block created client-side, not yet persisted. */
export function newBlockId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Groups the flat working-hours list into ordered blocks per weekday. */
export function groupByDay(hours: WorkingHour[]): Record<Weekday, Block[]> {
  const grouped = Object.fromEntries(
    WEEK_ORDER.map((day) => [day, [] as Block[]]),
  ) as Record<Weekday, Block[]>;

  for (const hour of hours) {
    grouped[hour.dayOfWeek].push({
      id: hour.id,
      startMinute: hour.startMinute,
      endMinute: hour.endMinute,
    });
  }

  for (const day of WEEK_ORDER) {
    grouped[day].sort((a, b) => a.startMinute - b.startMinute);
  }

  return grouped;
}

/**
 * Order-independent fingerprint of a day's blocks — ignores `id` on purpose
 * (a freshly-added, not-yet-saved block has a different id than the same
 * block once persisted, but that's not a *change* worth flagging as dirty).
 * Used to detect unsaved changes against the last-known server state.
 */
export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(
    [...blocks]
      .map((b): [number, number] => [b.startMinute, b.endMinute])
      .sort((a, b) => a[0] - b[0]),
  );
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
