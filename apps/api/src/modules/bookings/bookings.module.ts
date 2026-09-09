import { Module } from '@nestjs/common';
import { MailService } from '../../infra/mail/mail.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsCreateController } from './bookings-create.controller';
import { BookingsTokenController } from './bookings-token.controller';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ExpirationScheduler } from './expiration.scheduler';
import { RemindersScheduler } from './reminders.scheduler';

@Module({
  imports: [NotificationsModule],
  controllers: [
    BookingsController,
    BookingsCreateController,
    BookingsTokenController,
  ],
  providers: [
    BookingsService,
    MailService,
    RemindersScheduler,
    ExpirationScheduler,
  ],
})
export class BookingsModule {}
