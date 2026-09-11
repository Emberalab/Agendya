import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionsService } from './push-subscriptions.service';

/**
 * Exports `NotificationsService` so `BookingsModule` can record an
 * `APPOINTMENT_CREATED` entry after a booking commits. `RealtimeService` is
 * provided globally (`RealtimeModule`), and `JwtAuthGuard` relies on the
 * process-wide passport strategy, so nothing else needs importing here.
 *
 * `PushSubscriptionsService` owns the Web Push delivery channel and the
 * `/notifications/push/*` endpoints; it reads VAPID config from the global
 * `ConfigModule`.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushSubscriptionsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
