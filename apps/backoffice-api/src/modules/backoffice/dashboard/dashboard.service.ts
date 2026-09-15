import { Injectable } from '@nestjs/common';
import type { TicketStatus } from '@prisma/client';
import type { BackofficeDashboard } from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';
import { TICKET_SUMMARY_SELECT, toSummary } from '../tickets/tickets.service';

const ACTIVE_STATUSES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
];

@Injectable()
export class BackofficeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<BackofficeDashboard> {
    const [open, urgent, waiting, unassigned, recent] = await Promise.all([
      this.prisma.supportTicket.count({
        where: { status: { in: ACTIVE_STATUSES } },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ACTIVE_STATUSES }, priority: 'URGENT' },
      }),
      this.prisma.supportTicket.count({
        where: { status: 'WAITING_FOR_CUSTOMER' },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ACTIVE_STATUSES }, assignedToId: null },
      }),
      this.prisma.supportTicket.findMany({
        where: { status: { in: ACTIVE_STATUSES } },
        select: TICKET_SUMMARY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      openTickets: open,
      urgentTickets: urgent,
      waitingForCustomerTickets: waiting,
      unassignedTickets: unassigned,
      recentTickets: recent.map(toSummary),
    };
  }
}
