import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';

type ReminderField = 'reminder24hSentAt' | 'reminder2hSentAt';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron('*/15 * * * *')
  async send24hReminders(): Promise<void> {
    await this.sendReminders(24, 'reminder24hSentAt');
  }

  @Cron('*/15 * * * *')
  async send2hReminders(): Promise<void> {
    await this.sendReminders(2, 'reminder2hSentAt');
  }

  private async sendReminders(
    hoursBefore: 24 | 2,
    sentAtField: ReminderField,
  ): Promise<void> {
    const windowStart = new Date(Date.now() + hoursBefore * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        [sentAtField]: null,
        startAt: { gte: windowStart, lt: windowEnd },
      },
      include: { professional: true },
    });

    for (const booking of bookings) {
      try {
        await this.mailService.sendBookingReminder({
          to: booking.customerEmail,
          customerName: booking.customerName,
          businessName: booking.professional.businessName,
          serviceName: booking.serviceNameSnapshot,
          startAt: booking.startAt,
          timezone: booking.professional.timezone,
          hoursBefore,
        });
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { [sentAtField]: new Date() },
        });
      } catch (error) {
        this.logger.error(
          `No se pudo enviar el recordatorio de ${hoursBefore}h para la reserva ${booking.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
