import { Module } from '@nestjs/common';
import { MailService } from '../../infra/mail/mail.service';
import { BookingsCreateController } from './bookings-create.controller';
import { BookingsTokenController } from './bookings-token.controller';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { RemindersScheduler } from './reminders.scheduler';

@Module({
  controllers: [
    BookingsController,
    BookingsCreateController,
    BookingsTokenController,
  ],
  providers: [BookingsService, MailService, RemindersScheduler],
})
export class BookingsModule {}
