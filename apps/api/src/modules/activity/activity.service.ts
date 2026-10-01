import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ACTIVITY_EVENT_CATEGORY,
  type ActivityActor,
  type ActivityEventType,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { zonedDateParts } from '../../common/utils/timezone.util';

export interface RecordActivityInput {
  /** Defaults to PROFESSIONAL: the account owner acting in the dashboard. */
  actor?: ActivityActor;
  entityType?: string;
  entityId?: string;
  /** Human label of the entity at the time (e.g. the service name). */
  subject?: string | null;
  /**
   * Safe, non-secret context only. Never customer contact data (name,
   * email, phone, address, notes), passwords, tokens, or OAuth data.
   */
  metadata?: Record<string, unknown>;
}

/** In-process memo of visits already stored; bounded, reset when full. */
const VISIT_MEMO_LIMIT = 10_000;

/**
 * Records a professional's product activity (see `ProfessionalActivityEvent`).
 *
 * Callers invoke this only after the underlying change is committed, and it
 * never throws: activity is product analytics, so a failed insert is logged
 * and swallowed rather than failing (or rolling back) the user's action.
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  private readonly visitsRecorded = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async record(
    professionalId: string,
    type: ActivityEventType,
    input: RecordActivityInput = {},
  ): Promise<void> {
    try {
      await this.prisma.professionalActivityEvent.create({
        data: {
          professionalId,
          type,
          category: ACTIVITY_EVENT_CATEGORY[type],
          actor: input.actor ?? 'PROFESSIONAL',
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          subject: input.subject ?? null,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar la actividad ${type} de ${professionalId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * At most one DASHBOARD_VISITED per professional per calendar day in their
   * own time zone — enough to answer "did they come back?" without logging
   * every request. The unique `dedupeKey` makes this idempotent across
   * processes; the in-memory memo just skips the insert attempt.
   */
  async recordDailyVisit(
    professional: { id: string; timezone: string },
    now: Date = new Date(),
  ): Promise<void> {
    const { dateStr } = zonedDateParts(now, professional.timezone);
    const dedupeKey = `visit:${professional.id}:${dateStr}`;
    if (this.visitsRecorded.has(dedupeKey)) {
      return;
    }

    try {
      await this.prisma.professionalActivityEvent.createMany({
        data: [
          {
            professionalId: professional.id,
            type: 'DASHBOARD_VISITED',
            category: ACTIVITY_EVENT_CATEGORY.DASHBOARD_VISITED,
            actor: 'PROFESSIONAL',
            dedupeKey,
            occurredAt: now,
          },
        ],
        skipDuplicates: true,
      });
      if (this.visitsRecorded.size >= VISIT_MEMO_LIMIT) {
        this.visitsRecorded.clear();
      }
      this.visitsRecorded.add(dedupeKey);
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar la visita de ${professional.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

/** A changed field: its old and new value, or just `changed` when unsafe/large. */
export type FieldChange = { from: unknown; to: unknown } | { changed: true };

/**
 * Compares `before` against the fields present in `input` and returns only
 * the ones that actually changed. Fields in `opaque` (free text, image URLs)
 * are reported as `{ changed: true }` without their values.
 */
export function diffFields<T extends object>(
  before: T,
  input: Partial<T>,
  fields: readonly (keyof T & string)[],
  opaque: readonly (keyof T & string)[] = [],
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const field of fields) {
    const next = input[field];
    if (next === undefined) continue;
    const previous = before[field] ?? null;
    if (previous === (next ?? null)) continue;
    changes[field] = opaque.includes(field)
      ? { changed: true }
      : { from: previous, to: next ?? null };
  }
  return changes;
}
