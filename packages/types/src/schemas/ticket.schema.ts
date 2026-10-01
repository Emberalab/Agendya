import { z } from 'zod';
import { internalUserSummarySchema } from './internal-user.schema';

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const;
export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const TICKET_CATEGORIES = [
  'APPOINTMENTS',
  'SCHEDULE',
  'AVAILABILITY',
  'NOTIFICATIONS',
  'ACCOUNT',
  'LOGIN',
  'PAYMENTS',
  'BUG',
  'PERFORMANCE',
  'OTHER',
] as const;
export const ticketCategorySchema = z.enum(TICKET_CATEGORIES);
export type TicketCategory = z.infer<typeof ticketCategorySchema>;

/**
 * `INTERNAL_NOTE` messages must never be exposed to a professional — the
 * `/support/*` (professional-facing) endpoints only ever read and write
 * `CUSTOMER_VISIBLE` messages.
 */
export const MESSAGE_VISIBILITIES = ['CUSTOMER_VISIBLE', 'INTERNAL_NOTE'] as const;
export const messageVisibilitySchema = z.enum(MESSAGE_VISIBILITIES);
export type MessageVisibility = z.infer<typeof messageVisibilitySchema>;

export const ticketProfessionalSummarySchema = z.object({
  id: z.string().uuid(),
  businessName: z.string(),
  email: z.string().email(),
  slug: z.string(),
});
export type TicketProfessionalSummary = z.infer<
  typeof ticketProfessionalSummarySchema
>;

/**
 * A message's author is exactly one of staff (`INTERNAL`) or the
 * professional the ticket belongs to (`PROFESSIONAL`) — never both, never
 * neither. See `SupportMessage.authorInternalUserId`/`authorProfessionalId`
 * in schema.prisma for the enforcement note.
 */
export const messageAuthorSchema = z.discriminatedUnion('kind', [
  internalUserSummarySchema.extend({ kind: z.literal('INTERNAL') }),
  ticketProfessionalSummarySchema.extend({ kind: z.literal('PROFESSIONAL') }),
]);
export type MessageAuthor = z.infer<typeof messageAuthorSchema>;

export const supportMessageSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  author: messageAuthorSchema,
  visibility: messageVisibilitySchema,
  body: z.string(),
  createdAt: z.string(),
});
export type SupportMessage = z.infer<typeof supportMessageSchema>;

export const supportTicketSummarySchema = z.object({
  id: z.string().uuid(),
  professional: ticketProfessionalSummarySchema,
  subject: z.string(),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema,
  status: ticketStatusSchema,
  assignedTo: internalUserSummarySchema.nullable(),
  relatedBookingId: z.string().uuid().nullable(),
  messageCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupportTicketSummary = z.infer<typeof supportTicketSummarySchema>;

export const supportTicketDetailSchema = supportTicketSummarySchema.extend({
  messages: z.array(supportMessageSchema),
});
export type SupportTicketDetail = z.infer<typeof supportTicketDetailSchema>;

export const createTicketSchema = z.object({
  professionalId: z.string().uuid(),
  subject: z.string().trim().min(3).max(200),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema.default('NORMAL'),
  relatedBookingId: z.string().uuid().nullable().optional(),
  /** The first message, recorded as an internal note unless stated otherwise. */
  body: z.string().trim().min(1).max(5000),
  visibility: messageVisibilitySchema.default('INTERNAL_NOTE'),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const addTicketMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  visibility: messageVisibilitySchema,
});
export type AddTicketMessageInput = z.infer<typeof addTicketMessageSchema>;

export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
});
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

export const updateTicketPrioritySchema = z.object({
  priority: ticketPrioritySchema,
});
export type UpdateTicketPriorityInput = z.infer<
  typeof updateTicketPrioritySchema
>;

/** `assignedToId: null` unassigns the ticket. */
export const assignTicketSchema = z.object({
  assignedToId: z.string().uuid().nullable(),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const ticketListQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: ticketCategorySchema.optional(),
  assignedToId: z.string().uuid().optional(),
  professionalId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export const ticketListResponseSchema = z.object({
  items: z.array(supportTicketSummarySchema),
  nextCursor: z.string().nullable(),
});
export type TicketListResponse = z.infer<typeof ticketListResponseSchema>;

// --- Professional-facing (self-service) inputs ---------------------------
// Used by `/support/*`, not `/backoffice/*`: no `professionalId` (the
// authenticated professional is always the subject) and no `visibility`
// (every professional-authored message is CUSTOMER_VISIBLE, enforced
// server-side, never accepted from the client).

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: ticketCategorySchema,
  relatedBookingId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(5000),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const addSupportMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type AddSupportMessageInput = z.infer<typeof addSupportMessageSchema>;

export const supportTicketListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type SupportTicketListQuery = z.infer<typeof supportTicketListQuerySchema>;
