import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AuditAction,
  AuditLogEntry,
  AuditLogListQuery,
  AuditLogListResponse,
} from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';

const DEFAULT_ENTRY_SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AuditLogSelect;

/**
 * Append-only audit trail. `record()` is the *only* write path — there is no
 * update/delete anywhere for this model, by design (see the Backoffice
 * plan). Every mutating Backoffice action calls this from its own service;
 * `metadata` must never carry secrets, password hashes, or tokens.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actorInternalUserId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorInternalUserId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(query: AuditLogListQuery): Promise<AuditLogListResponse> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        entityType: query.entityType,
        entityId: query.entityId,
        actorInternalUserId: query.actorInternalUserId,
      },
      select: DEFAULT_ENTRY_SELECT,
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: page.map(toEntry),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}

function toEntry(
  row: Prisma.AuditLogGetPayload<{ select: typeof DEFAULT_ENTRY_SELECT }>,
): AuditLogEntry {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
