import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AddSupportMessageInput,
  CreateSupportTicketInput,
  MessageAuthor,
  SupportTicketDetail,
  SupportTicketListQuery,
  SupportTicketSummary,
  TicketListResponse,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';

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

// Every read here is scoped to `professionalId` at the query level (never
// just filtered client-side), and every message read is scoped to
// `visibility: 'CUSTOMER_VISIBLE'` — INTERNAL_NOTE must never reach this
// module. See the note on SupportMessage in schema.prisma.
const TICKET_SUMMARY_SELECT = {
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
  _count: {
    select: { messages: { where: { visibility: 'CUSTOMER_VISIBLE' } } },
  },
} satisfies Prisma.SupportTicketSelect;

const TICKET_DETAIL_SELECT = {
  ...TICKET_SUMMARY_SELECT,
  messages: {
    where: { visibility: 'CUSTOMER_VISIBLE' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      visibility: true,
      body: true,
      createdAt: true,
      author: { select: INTERNAL_USER_SUMMARY_SELECT },
      authorProfessional: { select: PROFESSIONAL_SUMMARY_SELECT },
    },
  },
} satisfies Prisma.SupportTicketSelect;

type TicketSummaryRow = Prisma.SupportTicketGetPayload<{
  select: typeof TICKET_SUMMARY_SELECT;
}>;
type TicketDetailRow = Prisma.SupportTicketGetPayload<{
  select: typeof TICKET_DETAIL_SELECT;
}>;

/**
 * Professional-facing self-service support tickets — see/create/reply on
 * one's own tickets. Distinct from `backoffice/tickets` (staff-facing, every
 * ticket, internal notes included): every query here filters by
 * `professionalId` and every message read filters to `CUSTOMER_VISIBLE`, so
 * there is no path for a professional to see another professional's ticket
 * or a staff-only internal note.
 */
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    professionalId: string,
    query: SupportTicketListQuery,
  ): Promise<TicketListResponse> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { professionalId },
      select: TICKET_SUMMARY_SELECT,
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

  async getOne(
    professionalId: string,
    id: string,
  ): Promise<SupportTicketDetail> {
    const row = await this.prisma.supportTicket.findFirst({
      where: { id, professionalId },
      select: TICKET_DETAIL_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Ticket no encontrado.');
    }
    return toDetail(row);
  }

  async create(
    professionalId: string,
    input: CreateSupportTicketInput,
  ): Promise<SupportTicketDetail> {
    const created = await this.prisma.supportTicket.create({
      data: {
        professionalId,
        subject: input.subject,
        category: input.category,
        relatedBookingId: input.relatedBookingId ?? null,
        messages: {
          create: {
            authorProfessionalId: professionalId,
            body: input.body,
            visibility: 'CUSTOMER_VISIBLE',
          },
        },
      },
      select: TICKET_DETAIL_SELECT,
    });

    return toDetail(created);
  }

  async addMessage(
    professionalId: string,
    ticketId: string,
    input: AddSupportMessageInput,
  ): Promise<SupportTicketDetail> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, professionalId },
      select: { id: true, status: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado.');
    }

    await this.prisma.supportMessage.create({
      data: {
        ticketId,
        authorProfessionalId: professionalId,
        body: input.body,
        visibility: 'CUSTOMER_VISIBLE',
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        // A reply while we were waiting on the customer means we're no
        // longer waiting — surface it back into the active queue instead of
        // leaving it parked under a stale status.
        ...(ticket.status === 'WAITING_FOR_CUSTOMER'
          ? { status: 'IN_PROGRESS' as const }
          : {}),
      },
    });

    return this.getOne(professionalId, ticketId);
  }
}

function toSummary(row: TicketSummaryRow): SupportTicketSummary {
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
  throw new Error(`Support message ${message.id} has no author.`);
}
