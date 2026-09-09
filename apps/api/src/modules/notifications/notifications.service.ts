import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  Booking,
  Notification as NotificationRow,
  NotificationType,
  Professional,
} from '@prisma/client';
import type {
  Notification,
  NotificationData,
  NotificationListQuery,
  NotificationListResponse,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

/**
 * Owns the persistent in-app notification feed. The `Notification` row is the
 * single source of truth; every delivery channel hangs off {@link create}:
 *
 *   persist notification  ->  emit SSE (if the professional is online)
 *                         ->  (future) Web Push (if a subscription exists)
 *
 * A future push channel is one more line in `create()` — no schema or API
 * change. All reads and writes are scoped to a `professionalId` that callers
 * take from the authenticated request, never from client input.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Records an `APPOINTMENT_CREATED` notification for a booking that has
   * already been persisted, then delivers it in real time. Best-effort: a
   * failure here is logged and swallowed — the booking is saved, the
   * confirmation email still goes out, and the professional recovers the entry
   * from `GET /notifications` on their next dashboard load.
   */
  async notifyAppointmentCreated(
    professional: Pick<Professional, 'id' | 'timezone'>,
    booking: Booking,
  ): Promise<void> {
    try {
      const data: NotificationData = {
        bookingId: booking.id,
        customerName: booking.customerName,
        serviceName: booking.serviceNameSnapshot,
        startAt: booking.startAt.toISOString(),
      };
      await this.create(professional.id, {
        type: 'APPOINTMENT_CREATED',
        title: 'Nueva cita',
        body: `${booking.customerName} reservó ${booking.serviceNameSnapshot} · ${this.formatWhen(
          booking.startAt,
          professional.timezone,
        )}`,
        data,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar la notificación de la reserva ${booking.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * The single write path for the feed. Persists the row, then fans it out over
   * SSE. Add further delivery channels (Web Push, email digest) here.
   */
  private async create(
    professionalId: string,
    input: {
      type: NotificationType;
      title: string;
      body: string;
      data: NotificationData;
    },
  ): Promise<Notification> {
    const row = await this.prisma.notification.create({
      data: {
        professionalId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });

    const dto = this.toDto(row);
    this.realtime.emitNotificationCreated(professionalId, dto);
    return dto;
  }

  /**
   * A page of the professional's notifications, newest first. Keyset-paginated
   * on `(createdAt, id)` so it is stable while new rows arrive at the head.
   */
  async list(
    professionalId: string,
    query: NotificationListQuery,
  ): Promise<NotificationListResponse> {
    const { limit } = query;
    const cursor = this.decodeCursor(query.cursor);

    const rows = await this.prisma.notification.findMany({
      where: {
        professionalId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((row) =>
      this.toDto(row),
    );
    const last = hasMore ? rows[limit - 1] : null;

    return {
      items,
      nextCursor: last ? this.encodeCursor(last.createdAt, last.id) : null,
    };
  }

  unreadCount(professionalId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { professionalId, readAt: null },
    });
  }

  /**
   * Marks one notification read. Ownership is enforced in the `where` clause —
   * a professional cannot touch another's row (it 404s instead). Idempotent:
   * re-marking an already-read notification is a no-op.
   */
  async markRead(professionalId: string, id: string): Promise<Notification> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, professionalId, readAt: null },
      data: { readAt: new Date() },
    });

    const row = await this.prisma.notification.findFirst({
      where: { id, professionalId },
    });
    if (!row) {
      throw new NotFoundException('Notificación no encontrada.');
    }
    if (count === 0) {
      this.logger.debug(`Notification ${id} was already read`);
    }
    return this.toDto(row);
  }

  async markAllRead(professionalId: string): Promise<{ updated: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { professionalId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: count };
  }

  private toDto(row: NotificationRow): Notification {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      data: row.data as unknown as NotificationData,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private formatWhen(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  }

  /** Opaque base64url cursor over `(createdAt, id)`. */
  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.getTime()}:${id}`).toString('base64url');
  }

  private decodeCursor(
    cursor: string | undefined,
  ): { createdAt: Date; id: string } | null {
    if (!cursor) return null;
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const sep = raw.indexOf(':');
      if (sep === -1) return null;
      const ms = Number(raw.slice(0, sep));
      const id = raw.slice(sep + 1);
      if (!Number.isFinite(ms) || !id) return null;
      return { createdAt: new Date(ms), id };
    } catch {
      return null;
    }
  }
}
