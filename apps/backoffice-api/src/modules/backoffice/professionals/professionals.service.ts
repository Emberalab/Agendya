import { Injectable, NotFoundException } from '@nestjs/common';
import type { BookingStatus } from '@prisma/client';
import type { Professional360 } from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TICKET_SUMMARY_SELECT, toSummary } from '../tickets/tickets.service';

const RECENT_LIMIT = 10;

/**
 * Read-only 360° view assembled entirely from existing tables — nothing here
 * changes the customer-facing `professionals` module. Every read is
 * audit-logged (`SUPPORT_VIEWED_PROFESSIONAL`): this endpoint has no
 * per-row ownership scoping (support staff legitimately need to see any
 * professional), so the audit trail is the compensating control.
 */
@Injectable()
export class BackofficeProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async get360(id: string, actorId: string): Promise<Professional360> {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        businessName: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true,
        timezone: true,
        category: true,
        slug: true,
        description: true,
        cancellationPolicyHours: true,
        brandColor: true,
      },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10));

    const [
      upcoming,
      recent,
      statusCounts,
      workingHours,
      exceptions,
      notifications,
      openTickets,
      resolvedTickets,
    ] = await Promise.all([
      this.prisma.booking.findMany({
        where: { professionalId: id, startAt: { gte: now } },
        select: BOOKING_SUMMARY_SELECT,
        orderBy: { startAt: 'asc' },
        take: RECENT_LIMIT,
      }),
      this.prisma.booking.findMany({
        where: { professionalId: id, startAt: { lt: now } },
        select: BOOKING_SUMMARY_SELECT,
        orderBy: { startAt: 'desc' },
        take: RECENT_LIMIT,
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { professionalId: id },
        _count: { _all: true },
      }),
      this.prisma.workingHour.findMany({
        where: { professionalId: id },
        select: {
          id: true,
          dayOfWeek: true,
          startMinute: true,
          endMinute: true,
        },
        orderBy: { dayOfWeek: 'asc' },
      }),
      this.prisma.scheduleException.findMany({
        where: { professionalId: id, date: { gte: today } },
        select: { id: true, date: true, reason: true },
        orderBy: { date: 'asc' },
        take: 20,
      }),
      this.prisma.notification.findMany({
        where: { professionalId: id },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
      }),
      this.prisma.supportTicket.findMany({
        where: {
          professionalId: id,
          status: { notIn: ['RESOLVED', 'CLOSED'] },
        },
        select: TICKET_SUMMARY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIMIT,
      }),
      this.prisma.supportTicket.findMany({
        where: { professionalId: id, status: { in: ['RESOLVED', 'CLOSED'] } },
        select: TICKET_SUMMARY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIMIT,
      }),
    ]);

    await this.auditLog.record(
      actorId,
      'SUPPORT_VIEWED_PROFESSIONAL',
      'Professional',
      id,
    );

    const countFor = (status: BookingStatus) =>
      statusCounts.find((row) => row.status === status)?._count._all ?? 0;

    return {
      account: {
        id: professional.id,
        email: professional.email,
        businessName: professional.businessName,
        role: professional.role,
        plan: professional.plan,
        isActive: professional.isActive,
        createdAt: professional.createdAt.toISOString(),
        timezone: professional.timezone,
      },
      business: {
        businessName: professional.businessName,
        category: professional.category,
        slug: professional.slug,
        description: professional.description,
        cancellationPolicyHours: professional.cancellationPolicyHours,
        brandColor: professional.brandColor,
      },
      appointments: {
        upcoming: upcoming.map(toBookingSummary),
        recent: recent.map(toBookingSummary),
        counts: {
          completed: countFor('COMPLETED'),
          cancelled: countFor('CANCELLED'),
          noShow: countFor('NO_SHOW'),
          expired: countFor('EXPIRED'),
        },
      },
      schedule: {
        workingHours,
        exceptions: exceptions.map((row) => ({
          id: row.id,
          date: row.date.toISOString().slice(0, 10),
          reason: row.reason,
        })),
      },
      notifications: {
        recent: notifications.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body,
          readAt: row.readAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      support: {
        open: openTickets.map(toSummary),
        resolved: resolvedTickets.map(toSummary),
      },
    };
  }
}

const BOOKING_SUMMARY_SELECT = {
  id: true,
  serviceNameSnapshot: true,
  customerName: true,
  startAt: true,
  endAt: true,
  status: true,
  atHome: true,
} as const;

function toBookingSummary(row: {
  id: string;
  serviceNameSnapshot: string;
  customerName: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  atHome: boolean;
}) {
  return {
    id: row.id,
    serviceName: row.serviceNameSnapshot,
    customerName: row.customerName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    atHome: row.atHome,
  };
}
