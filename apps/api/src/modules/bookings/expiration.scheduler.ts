import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

/**
 * Periodically flips CONFIRMED bookings whose scheduled start has passed to
 * EXPIRED. This is a backstop, not the primary enforcement: every mutating
 * endpoint (cancel/reschedule/complete) already revalidates `startAt` against
 * `Date.now()` itself and self-heals the row it touches (see
 * BookingsService.assertModifiable), so a booking can never be rescheduled
 * just because this sweep hasn't run yet. This job exists so the Agenda list
 * reflects "vencida" promptly for bookings nobody interacts with.
 */
@Injectable()
export class ExpirationScheduler {
  private readonly logger = new Logger(ExpirationScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/15 * * * *')
  async expireStaleBookings(): Promise<void> {
    // Same guard as RemindersScheduler — avoids racing serializable booking
    // transactions with concurrent reads/writes on the same rows mid-suite.
    if (process.env.DISABLE_SCHEDULED_JOBS === 'true') {
      return;
    }

    try {
      const { count } = await this.prisma.booking.updateMany({
        where: { status: 'CONFIRMED', startAt: { lt: new Date() } },
        data: { status: 'EXPIRED' },
      });
      if (count > 0) {
        this.logger.log(`Marcadas ${count} reserva(s) como vencidas.`);
      }
    } catch (error) {
      this.logger.error(
        'No se pudo ejecutar el barrido de reservas vencidas',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
