import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ActivityEventType, BookingStatus } from '@prisma/client';
import {
  WEEKDAYS,
  effectivePlan,
  type ActivityEvent,
  type ActivityListQuery,
  type ActivityListResponse,
  type ActivitySummary,
  type TrialAccount,
  type TrialListQuery,
  type TrialListResponse,
  type WorkingDaySummary,
} from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  daysRemaining,
  daysSince,
  localDate,
  localDaysBetween,
  resolveListRange,
  resolveSummaryWindow,
  trialStatus,
} from './activity-window';

const EVENT_SELECT = {
  id: true,
  type: true,
  category: true,
  actor: true,
  entityType: true,
  entityId: true,
  subject: true,
  metadata: true,
  backfilled: true,
  occurredAt: true,
} satisfies Prisma.ProfessionalActivityEventSelect;

/** Usage counters read from the activity log (none of these leave another trace). */
const USAGE_EVENT_TYPES: ActivityEventType[] = [
  'SERVICE_CREATED',
  'SERVICE_UPDATED',
  'SERVICE_DELETED',
  'WORKING_HOURS_UPDATED',
  'SCHEDULE_EXCEPTION_CREATED',
  'PROFILE_UPDATED',
];

/**
 * Read side of a professional's product activity for the Backoffice
 * ("how is this professional using Agendya?"). The timeline comes from
 * `ProfessionalActivityEvent` (written by apps/api); every business metric
 * is derived from the business tables themselves, so nothing here can drift
 * from what the professional actually sees. Read-only: no write path.
 */
@Injectable()
export class ProfessionalActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(
    professionalId: string,
    query: ActivityListQuery,
  ): Promise<ActivityListResponse> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      select: { trialStartedAt: true, trialEndsAt: true },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    const range = resolveListRange(query, professional);
    if (!range) {
      return { items: [], nextCursor: null };
    }

    const rows = await this.prisma.professionalActivityEvent.findMany({
      where: {
        // Always scoped to the professional in the path: a cursor or entity
        // id from another account can never widen the result.
        professionalId,
        ...(range.gte || range.lte ? { occurredAt: range } : {}),
        category: query.category,
        type: query.type,
        actor: query.actor,
        entityId: query.entityId,
        ...(query.search
          ? { subject: { contains: query.search, mode: 'insensitive' } }
          : {}),
      },
      select: EVENT_SELECT,
      orderBy: [{ occurredAt: query.order }, { id: query.order }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: page.map(toEvent),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async summary(
    professionalId: string,
    actorId: string,
    now: Date = new Date(),
  ): Promise<ActivitySummary> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      select: {
        id: true,
        email: true,
        businessName: true,
        slug: true,
        timezone: true,
        createdAt: true,
        plan: true,
        trialStartedAt: true,
        trialEndsAt: true,
        category: true,
        description: true,
        logoUrl: true,
        photoUrl: true,
        coverImageUrl: true,
      },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    const window = resolveSummaryWindow(professional, now);
    const inWindow = { gte: window.from, lte: window.to };
    const bookingsInWindow = { professionalId, createdAt: inWindow };
    const byPro = { professionalId };
    // ScheduleException.date is a calendar date: compare with the local today.
    const today = new Date(localDate(now, professional.timezone));

    const [
      trialHistory,
      statusCounts,
      sourceCounts,
      cancelledByCounts,
      reschedules,
      customerCounts,
      servicesTotal,
      servicesActive,
      servicesLocked,
      workingHours,
      upcomingBlockedDates,
      pushDevices,
      usageCounts,
      notificationsReceived,
      notificationsRead,
      supportTicketsOpened,
      ownActivity,
      liveActivity,
      bookingBounds,
      firstManualBooking,
      firstService,
      firstSchedule,
      dailyOwn,
      dailyBookings,
    ] = await Promise.all([
      this.prisma.trialEvent.findMany({
        where: byPro,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: bookingsInWindow,
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['source'],
        where: bookingsInWindow,
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['cancelledBy'],
        where: { ...bookingsInWindow, status: 'CANCELLED' },
        _count: { _all: true },
      }),
      // Reschedules overwrite Booking.startAt, so the explicit events are
      // the only source for them.
      this.prisma.professionalActivityEvent.groupBy({
        by: ['entityId'],
        where: {
          ...byPro,
          type: 'BOOKING_RESCHEDULED',
          occurredAt: inWindow,
        },
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['customerPhone'],
        where: bookingsInWindow,
        _count: { _all: true },
      }),
      this.prisma.service.count({ where: { ...byPro, deletedAt: null } }),
      this.prisma.service.count({
        where: { ...byPro, deletedAt: null, isActive: true, planLocked: false },
      }),
      this.prisma.service.count({
        where: { ...byPro, deletedAt: null, planLocked: true },
      }),
      this.prisma.workingHour.findMany({
        where: byPro,
        select: { dayOfWeek: true, startMinute: true, endMinute: true },
      }),
      this.prisma.scheduleException.count({
        where: { ...byPro, date: { gte: today } },
      }),
      this.prisma.pushSubscription.count({ where: byPro }),
      this.prisma.professionalActivityEvent.groupBy({
        by: ['type'],
        where: {
          ...byPro,
          type: { in: USAGE_EVENT_TYPES },
          occurredAt: inWindow,
        },
        _count: { _all: true },
      }),
      this.prisma.notification.count({
        where: { ...byPro, createdAt: inWindow },
      }),
      this.prisma.notification.count({
        where: { ...byPro, createdAt: inWindow, readAt: { not: null } },
      }),
      this.prisma.supportTicket.count({
        where: { ...byPro, createdAt: inWindow },
      }),
      this.prisma.professionalActivityEvent.aggregate({
        where: { ...byPro, actor: 'PROFESSIONAL' },
        _min: { occurredAt: true },
        _max: { occurredAt: true },
      }),
      this.prisma.professionalActivityEvent.aggregate({
        where: { ...byPro, backfilled: false },
        _min: { occurredAt: true },
      }),
      this.prisma.booking.aggregate({
        where: byPro,
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      this.prisma.booking.aggregate({
        where: { ...byPro, source: 'MANUAL' },
        _min: { createdAt: true },
      }),
      this.prisma.service.aggregate({
        where: byPro,
        _min: { createdAt: true },
      }),
      this.prisma.professionalActivityEvent.aggregate({
        where: { ...byPro, type: 'WORKING_HOURS_UPDATED' },
        _min: { occurredAt: true },
      }),
      this.countPerLocalDay(
        Prisma.sql`SELECT "occurredAt" AS at FROM "ProfessionalActivityEvent"
          WHERE "professionalId" = ${professionalId}
            AND "actor" = 'PROFESSIONAL'
            AND "occurredAt" >= ${window.from} AND "occurredAt" <= ${window.to}`,
        professional.timezone,
      ),
      this.countPerLocalDay(
        Prisma.sql`SELECT "createdAt" AS at FROM "Booking"
          WHERE "professionalId" = ${professionalId}
            AND "createdAt" >= ${window.from} AND "createdAt" <= ${window.to}`,
        professional.timezone,
      ),
    ]);

    await this.auditLog.record(
      actorId,
      'SUPPORT_VIEWED_PROFESSIONAL_ACTIVITY',
      'Professional',
      professionalId,
    );

    const statusCount = (status: BookingStatus) =>
      statusCounts.find((row) => row.status === status)?._count._all ?? 0;
    const usageCount = (type: ActivityEventType) =>
      usageCounts.find((row) => row.type === type)?._count._all ?? 0;
    const cancelledBy = (who: string) =>
      cancelledByCounts.find((row) => row.cancelledBy === who)?._count._all ??
      0;

    const days = summarizeWeek(workingHours);
    const dates = localDaysBetween(
      window.from,
      window.to,
      professional.timezone,
    );
    const lastActivityAt = ownActivity._max.occurredAt;

    return {
      professional: {
        id: professional.id,
        email: professional.email,
        businessName: professional.businessName,
        slug: professional.slug,
        timezone: professional.timezone,
        createdAt: professional.createdAt.toISOString(),
        plan: professional.plan,
        effectivePlan: effectivePlan(professional, now),
      },
      trial: {
        status: trialStatus(professional, now),
        startedAt: professional.trialStartedAt?.toISOString() ?? null,
        endsAt: professional.trialEndsAt?.toISOString() ?? null,
        daysRemaining: daysRemaining(professional, now),
        history: trialHistory.map((event) => ({
          id: event.id,
          action: event.action,
          actorEmail: event.actorEmail,
          previousEndsAt: event.previousEndsAt?.toISOString() ?? null,
          endsAt: event.endsAt.toISOString(),
          note: event.note,
          createdAt: event.createdAt.toISOString(),
        })),
      },
      window: {
        basis: window.basis,
        from: window.from.toISOString(),
        to: window.to.toISOString(),
      },
      appointments: {
        total: statusCounts.reduce((sum, row) => sum + row._count._all, 0),
        online:
          sourceCounts.find((row) => row.source === 'ONLINE')?._count._all ?? 0,
        manual:
          sourceCounts.find((row) => row.source === 'MANUAL')?._count._all ?? 0,
        pending: statusCount('PENDING'),
        confirmed: statusCount('CONFIRMED'),
        completed: statusCount('COMPLETED'),
        cancelled: statusCount('CANCELLED'),
        cancelledByCustomer: cancelledBy('customer'),
        cancelledByProfessional: cancelledBy('professional'),
        noShow: statusCount('NO_SHOW'),
        expired: statusCount('EXPIRED'),
        rescheduled: reschedules.length,
        rescheduleEvents: reschedules.reduce(
          (sum, row) => sum + row._count._all,
          0,
        ),
      },
      customers: {
        distinct: customerCounts.length,
        returning: customerCounts.filter((row) => row._count._all > 1).length,
      },
      configuration: {
        profile: {
          hasCategory: !!professional.category?.trim(),
          hasDescription: !!professional.description?.trim(),
          hasLogoOrPhoto: !!(professional.logoUrl || professional.photoUrl),
          hasCoverImage: !!professional.coverImageUrl,
        },
        services: {
          total: servicesTotal,
          active: servicesActive,
          planLocked: servicesLocked,
        },
        schedule: {
          workingDays: days.length,
          timeBlocks: workingHours.length,
          days,
          upcomingBlockedDates,
        },
        pushDevices,
      },
      usage: {
        servicesCreated: usageCount('SERVICE_CREATED'),
        servicesUpdated: usageCount('SERVICE_UPDATED'),
        servicesDeleted: usageCount('SERVICE_DELETED'),
        scheduleChanges: usageCount('WORKING_HOURS_UPDATED'),
        blockedDatesCreated: usageCount('SCHEDULE_EXCEPTION_CREATED'),
        profileUpdates: usageCount('PROFILE_UPDATED'),
        notificationsReceived,
        notificationsRead,
        supportTicketsOpened,
      },
      engagement: {
        firstActivityAt: ownActivity._min.occurredAt?.toISOString() ?? null,
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
        activeDays: dates.filter((date) => (dailyOwn.get(date) ?? 0) > 0)
          .length,
        windowDays: dates.length,
        daysSinceLastActivity: daysSince(lastActivityAt, now),
        lastBookingCreatedAt:
          bookingBounds._max.createdAt?.toISOString() ?? null,
      },
      milestones: {
        accountCreatedAt: professional.createdAt.toISOString(),
        firstServiceAt: firstService._min.createdAt?.toISOString() ?? null,
        firstScheduleAt: firstSchedule._min.occurredAt?.toISOString() ?? null,
        firstBookingAt: bookingBounds._min.createdAt?.toISOString() ?? null,
        firstManualBookingAt:
          firstManualBooking._min.createdAt?.toISOString() ?? null,
      },
      daily: dates.map((date) => ({
        date,
        professionalEvents: dailyOwn.get(date) ?? 0,
        bookingsCreated: dailyBookings.get(date) ?? 0,
      })),
      trackedSince: liveActivity._min.occurredAt?.toISOString() ?? null,
    };
  }

  async listTrials(
    query: TrialListQuery,
    now: Date = new Date(),
  ): Promise<TrialListResponse> {
    const where: Prisma.ProfessionalWhereInput =
      query.status === 'ACTIVE'
        ? { trialStartedAt: { lte: now }, trialEndsAt: { gt: now } }
        : query.status === 'ENDED'
          ? { trialStartedAt: { not: null }, trialEndsAt: { lte: now } }
          : { trialStartedAt: { not: null }, trialEndsAt: { not: null } };

    // Latest-ending first: running trials on top, then the most recent ended.
    const rows = await this.prisma.professional.findMany({
      where,
      select: {
        id: true,
        email: true,
        businessName: true,
        slug: true,
        trialStartedAt: true,
        trialEndsAt: true,
      },
      orderBy: [{ trialEndsAt: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const ids = page.map((row) => row.id);

    // Two batched queries for the whole page — no per-row lookups.
    const [lastActivity, bookingCounts] = ids.length
      ? await Promise.all([
          this.prisma.professionalActivityEvent.groupBy({
            by: ['professionalId'],
            where: { professionalId: { in: ids }, actor: 'PROFESSIONAL' },
            _max: { occurredAt: true },
          }),
          this.prisma.$queryRaw<{ professionalId: string; count: number }[]>`
            SELECT b."professionalId", COUNT(*)::int AS count
            FROM "Booking" b
            JOIN "Professional" p ON p."id" = b."professionalId"
            WHERE b."professionalId" = ANY(${ids}::text[])
              AND b."createdAt" >= p."trialStartedAt"
              AND b."createdAt" < p."trialEndsAt"
            GROUP BY b."professionalId"`,
        ])
      : [[], []];

    const items: TrialAccount[] = page.map((row) => {
      const trial = {
        trialStartedAt: row.trialStartedAt,
        trialEndsAt: row.trialEndsAt,
      };
      return {
        id: row.id,
        email: row.email,
        businessName: row.businessName,
        slug: row.slug,
        status: trialStatus(trial, now),
        startedAt: row.trialStartedAt!.toISOString(),
        endsAt: row.trialEndsAt!.toISOString(),
        daysRemaining: daysRemaining(trial, now),
        lastActivityAt:
          lastActivity
            .find((entry) => entry.professionalId === row.id)
            ?._max.occurredAt?.toISOString() ?? null,
        bookingsInTrial:
          bookingCounts.find((entry) => entry.professionalId === row.id)
            ?.count ?? 0,
      };
    });

    return {
      items,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /**
   * Counts rows of `source` (a query selecting one timestamp column `at`) per
   * local calendar day, grouped in Postgres so only one row per day returns.
   */
  private async countPerLocalDay(
    source: Prisma.Sql,
    timeZone: string,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char((s.at AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count
      FROM (${source}) s
      GROUP BY 1`;
    return new Map(rows.map((row) => [row.day, row.count]));
  }
}

function toEvent(
  row: Prisma.ProfessionalActivityEventGetPayload<{
    select: typeof EVENT_SELECT;
  }>,
): ActivityEvent {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    actor: row.actor,
    entityType: row.entityType,
    entityId: row.entityId,
    subject: row.subject,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    backfilled: row.backfilled,
    occurredAt: row.occurredAt.toISOString(),
  };
}

/** The week as `{ dayOfWeek, blocks }`, Sunday first, blocks sorted. */
export function summarizeWeek(
  hours: { dayOfWeek: string; startMinute: number; endMinute: number }[],
): WorkingDaySummary[] {
  return WEEKDAYS.flatMap((dayOfWeek) => {
    const blocks = hours
      .filter((hour) => hour.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((hour): [number, number] => [hour.startMinute, hour.endMinute]);
    return blocks.length > 0 ? [{ dayOfWeek, blocks }] : [];
  });
}
