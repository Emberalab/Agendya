import { z } from 'zod';
import { internalUserSummarySchema } from './internal-user.schema';

/**
 * Immutable audit trail for Backoffice actions. Rows are only ever created —
 * there is intentionally no update/delete endpoint anywhere in the API.
 */
export const AUDIT_ACTIONS = [
  'SUPPORT_VIEWED_PROFESSIONAL',
  'TICKET_CREATED',
  'TICKET_ASSIGNED',
  'TICKET_STATUS_CHANGED',
  'TICKET_PRIORITY_CHANGED',
  'TICKET_MESSAGE_ADDED',
  'INTERNAL_USER_CREATED',
  'INTERNAL_USER_ROLE_CHANGED',
  'INTERNAL_USER_DEACTIVATED',
] as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  actor: internalUserSummarySchema,
  action: auditActionSchema,
  entityType: z.string(),
  entityId: z.string(),
  /** Safe, non-secret before/after context. Never tokens, hashes, or env values. */
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const auditLogListQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorInternalUserId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;

export const auditLogListResponseSchema = z.object({
  items: z.array(auditLogEntrySchema),
  nextCursor: z.string().nullable(),
});

export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;
