import { Injectable, NotFoundException } from '@nestjs/common';
import type { Weekday } from '@prisma/client';
import type { AppointmentInvestigation } from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';
import { TICKET_SUMMARY_SELECT, toSummary } from '../tickets/tickets.service';

const WEEKDAYS: Weekday[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Read-only appointment troubleshooting view — answers "why couldn't this
 * customer book", "why wasn't this cancelled", "why no notification" by
 * assembling the booking with the schedule + notifications that were live
 * around it, without the agent hand-querying Postgres.
 */
@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async investigate(bookingId: string): Promise<AppointmentInvestigation> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        serviceNameSnapshot: true,
        durationMinutesSnapshot: true,
        startAt: true,
        endAt: true,
        status: true,
        atHome: true,
        customerAddress: true,
        cancelledAt: true,
        cancelledBy: true,
        reminder24hSentAt: true,
        reminder2hSentAt: true,
        createdAt: true,
        updatedAt: true,
        professional: {
          select: { id: true, businessName: true, email: true, slug: true },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException('Cita no encontrada.');
    }

    const bookingDate = booking.startAt.toISOString().slice(0, 10);
    const weekday = WEEKDAYS[booking.startAt.getUTCDay()];

    const [workingHoursThatDay, scheduleException, notifications, tickets] =
      await Promise.all([
        this.prisma.workingHour.findMany({
          where: {
            professionalId: booking.professional.id,
            dayOfWeek: weekday,
          },
          select: {
            id: true,
            dayOfWeek: true,
            startMinute: true,
            endMinute: true,
          },
        }),
        this.prisma.scheduleException.findFirst({
          where: {
            professionalId: booking.professional.id,
            date: new Date(bookingDate),
          },
          select: { id: true, date: true, reason: true },
        }),
        // `Notification.data` is a JSON blob that always carries `bookingId`
        // for appointment-related entries (see NotificationsService) — no
        // schema change needed to correlate here.
        this.prisma.notification.findMany({
          where: {
            professionalId: booking.professional.id,
            data: { path: ['bookingId'], equals: booking.id },
          },
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            readAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.supportTicket.findMany({
          where: { relatedBookingId: booking.id },
          select: TICKET_SUMMARY_SELECT,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    return {
      booking: {
        id: booking.id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceNameSnapshot: booking.serviceNameSnapshot,
        durationMinutesSnapshot: booking.durationMinutesSnapshot,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        status: booking.status,
        atHome: booking.atHome,
        customerAddress: booking.customerAddress,
        cancelledAt: booking.cancelledAt?.toISOString() ?? null,
        cancelledBy: booking.cancelledBy,
        reminder24hSentAt: booking.reminder24hSentAt?.toISOString() ?? null,
        reminder2hSentAt: booking.reminder2hSentAt?.toISOString() ?? null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      },
      professional: booking.professional,
      workingHoursThatDay,
      scheduleException: scheduleException
        ? {
            id: scheduleException.id,
            date: scheduleException.date.toISOString().slice(0, 10),
            reason: scheduleException.reason,
          }
        : null,
      relatedNotifications: notifications.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      relatedTickets: tickets.map(toSummary),
    };
  }
}
