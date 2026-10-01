import { Module } from '@nestjs/common';
import { MailService } from '../../infra/mail/mail.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { UsageAlertsService } from './usage-alerts.service';

/**
 * Exports `NotificationsService` so `BookingsModule` can record an
 * `APPOINTMENT_CREATED` entry after a booking commits. `RealtimeService` is
 * provided globally (`RealtimeModule`), and `JwtAuthGuard` relies on the
 * process-wide passport strategy, so nothing else needs importing here.
 *
 * `PushSubscriptionsService` owns the Web Push delivery channel and the
 * `/notifications/push/*` endpoints; it reads VAPID config from the global
 * `ConfigModule`.
 *
 * `UsageAlertsService` sends usage limit alert emails (bookings/services)
 * and is exported so `BookingsModule` and `ServicesModule` can call it after
 * creating new records.
 */
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushSubscriptionsService,
    UsageAlertsService,
    MailService,
  ],
  exports: [NotificationsService, UsageAlertsService],
})
export class NotificationsModule {}
