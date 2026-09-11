import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Exports `NotificationsService` so `BookingsModule` can record an
 * `APPOINTMENT_CREATED` entry after a booking commits. `RealtimeService` is
 * provided globally (`RealtimeModule`), and `JwtAuthGuard` relies on the
 * process-wide passport strategy, so nothing else needs importing here.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
