import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InternalUser, Prisma } from '@prisma/client';
import type {
  AddTicketMessageInput,
  AssignTicketInput,
  CreateTicketInput,
  MessageAuthor,
  SupportTicketDetail,
  SupportTicketSummary,
  TicketListQuery,
  TicketListResponse,
  UpdateTicketPriorityInput,
  UpdateTicketStatusInput,
} from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { roleHasPermission } from '../common/permissions';

const PROFESSIONAL_SUMMARY_SELECT = {
  id: true,
  businessName: true,
  email: true,
  slug: true,
} satisfies Prisma.ProfessionalSelect;

const INTERNAL_USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.InternalUserSelect;

export const TICKET_SUMMARY_SELECT = {
  id: true,
  subject: true,
  category: true,
  priority: true,
  status: true,
  relatedBookingId: true,
  createdAt: true,
  updatedAt: true,
  professional: { select: PROFESSIONAL_SUMMARY_SELECT },
  assignedTo: { select: INTERNAL_USER_SUMMARY_SELECT },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketSelect;

const TICKET_DETAIL_SELECT = {
  ...TICKET_SUMMARY_SELECT,
  messages: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      visibility: true,
      body: true,
      createdAt: true,
      // Exactly one of these two relations is populated per message — see
      // the authorInternalUserId/authorProfessionalId note in schema.prisma.
      author: { select: INTERNAL_USER_SUMMARY_SELECT },
      authorProfessional: { select: PROFESSIONAL_SUMMARY_SELECT },
    },
  },
} satisfies Prisma.SupportTicketSelect;

export type TicketSummaryRow = Prisma.SupportTicketGetPayload<{
  select: typeof TICKET_SUMMARY_SELECT;
}>;
type TicketDetailRow = Prisma.SupportTicketGetPayload<{
  select: typeof TICKET_DETAIL_SELECT;
}>;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(query: TicketListQuery): Promise<TicketListResponse> {
    const rows = await this.prisma.supportTicket.findMany({
      where: {
        status: query.status,
        priority: query.priority,
        category: query.category,
        assignedToId: query.assignedToId,
        professionalId: query.professionalId,
      },
      select: TICKET_SUMMARY_SELECT,
      // Urgent/high-priority, most-recently-updated tickets first — the
      // shape a support queue actually gets worked in.
      orderBy: [{ updatedAt: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items: page.map(toSummary),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async getOne(id: string): Promise<SupportTicketDetail> {
    const row = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: TICKET_DETAIL_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Ticket no encontrado.');
    }
    return toDetail(row);
  }

  async create(
    input: CreateTicketInput,
    actor: InternalUser,
  ): Promise<SupportTicketDetail> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: input.professionalId },
      select: { id: true },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    const created = await this.prisma.supportTicket.create({
      data: {
        professionalId: input.professionalId,
        subject: input.subject,
        category: input.category,
        priority: input.priority,
        relatedBookingId: input.relatedBookingId ?? null,
        messages: {
          create: {
            authorInternalUserId: actor.id,
            body: input.body,
            visibility: input.visibility,
          },
        },
      },
      select: TICKET_DETAIL_SELECT,
    });

    await this.auditLog.record(
      actor.id,
      'TICKET_CREATED',
      'SupportTicket',
      created.id,
      {
        professionalId: input.professionalId,
        category: input.category,
        priority: input.priority,
      },
    );

    return toDetail(created);
  }

  async addMessage(
    ticketId: string,
    input: AddTicketMessageInput,
    actor: InternalUser,
  ): Promise<SupportTicketDetail> {
    await this.requireTicket(ticketId);

    await this.prisma.supportMessage.create({
      data: {
        ticketId,
        authorInternalUserId: actor.id,
        body: input.body,
        visibility: input.visibility,
      },
    });
    await this.touchTicket(ticketId);

    await this.auditLog.record(
      actor.id,
      'TICKET_MESSAGE_ADDED',
      'SupportTicket',
      ticketId,
      { visibility: input.visibility },
    );

    return this.getOne(ticketId);
  }

  async updateStatus(
    ticketId: string,
    input: UpdateTicketStatusInput,
    actor: InternalUser,
  ): Promise<SupportTicketDetail> {
    const existing = await this.requireTicket(ticketId);

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: input.status },
    });

    await this.auditLog.record(
      actor.id,
      'TICKET_STATUS_CHANGED',
      'SupportTicket',
      ticketId,
      { from: existing.status, to: input.status },
    );

    return this.getOne(ticketId);
  }

  async updatePriority(
    ticketId: string,
    input: UpdateTicketPriorityInput,
    actor: InternalUser,
  ): Promise<SupportTicketDetail> {
    const existing = await this.requireTicket(ticketId);

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { priority: input.priority },
    });

    await this.auditLog.record(
      actor.id,
      'TICKET_PRIORITY_CHANGED',
      'SupportTicket',
      ticketId,
      { from: existing.priority, to: input.priority },
    );

    return this.getOne(ticketId);
  }

  async assign(
    ticketId: string,
    input: AssignTicketInput,
    actor: InternalUser,
  ): Promise<SupportTicketDetail> {
    const existing = await this.requireTicket(ticketId);

    // SUPPORT lacks ASSIGN_ANY_TICKET: they may only assign a ticket to
    // themselves, or unassign a ticket that is currently theirs.
    if (!roleHasPermission(actor.role, 'ASSIGN_ANY_TICKET')) {
      const targetIsSelf = input.assignedToId === actor.id;
      const unassigningOwn =
        input.assignedToId === null && existing.assignedToId === actor.id;
      if (!targetIsSelf && !unassigningOwn) {
        throw new ForbiddenException(
          'Solo puedes asignarte tickets a ti mismo.',
        );
      }
    }

    if (input.assignedToId) {
      const assignee = await this.prisma.internalUser.findUnique({
        where: { id: input.assignedToId },
        select: { id: true, isActive: true },
      });
      if (!assignee || !assignee.isActive) {
        throw new NotFoundException(
          'El usuario interno asignado no existe o está inactivo.',
        );
      }
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId: input.assignedToId },
    });

    await this.auditLog.record(
      actor.id,
      'TICKET_ASSIGNED',
      'SupportTicket',
      ticketId,
      { from: existing.assignedToId, to: input.assignedToId },
    );

    return this.getOne(ticketId);
  }

  private async requireTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, status: true, priority: true, assignedToId: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado.');
    }
    return ticket;
  }

  private async touchTicket(id: string): Promise<void> {
    await this.prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }
}

export function toSummary(row: TicketSummaryRow): SupportTicketSummary {
  return {
    id: row.id,
    professional: row.professional,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assignedTo,
    relatedBookingId: row.relatedBookingId,
    messageCount: row._count.messages,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: TicketDetailRow): SupportTicketDetail {
  return {
    ...toSummary(row),
    messages: row.messages.map((message) => ({
      id: message.id,
      ticketId: row.id,
      author: toMessageAuthor(message),
      visibility: message.visibility,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

function toMessageAuthor(
  message: TicketDetailRow['messages'][number],
): MessageAuthor {
  if (message.author) {
    return { kind: 'INTERNAL', ...message.author };
  }
  if (message.authorProfessional) {
    return { kind: 'PROFESSIONAL', ...message.authorProfessional };
  }
  // Unreachable per the schema invariant (exactly one is always set), but
  // keeps this function total instead of returning `undefined` silently.
  throw new Error(`Support message ${message.id} has no author.`);
}
