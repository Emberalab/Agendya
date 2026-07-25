import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  dateOnlyUtc,
  weekdayFromDateString,
  zonedInstant,
} from '../../common/utils/timezone.util';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    dateStr: string,
  ): Promise<string[]> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, professionalId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado.');
    }

    const workingHour = await this.prisma.workingHour.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId,
          dayOfWeek: weekdayFromDateString(dateStr),
        },
      },
    });
    if (!workingHour) {
      return [];
    }

    const exception = await this.prisma.scheduleException.findUnique({
      where: {
        professionalId_date: { professionalId, date: dateOnlyUtc(dateStr) },
      },
    });
    if (exception) {
      return [];
    }

    const dayStart = zonedInstant(dateStr, 0, professional.timezone);
    const dayEnd = zonedInstant(dateStr, 24 * 60, professional.timezone);

    const bookings = await this.prisma.booking.findMany({
      where: {
        professionalId,
        status: 'CONFIRMED',
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    });
    const busyRanges = bookings.map(
      (booking) =>
        [booking.startAt.getTime(), booking.endAt.getTime()] as const,
    );

    const gridMinutes = this.configService.get<number>('slotGridMinutes') ?? 15;
    const now = Date.now();
    const slots: string[] = [];

    for (
      let start = workingHour.startMinute;
      start + service.durationMinutes <= workingHour.endMinute;
      start += gridMinutes
    ) {
      const slotStart = zonedInstant(dateStr, start, professional.timezone);
      const slotStartMs = slotStart.getTime();
      if (slotStartMs <= now) {
        continue;
      }

      const slotEndMs = slotStartMs + service.durationMinutes * 60_000;
      const overlapsBusy = busyRanges.some(
        ([busyStart, busyEnd]) =>
          slotStartMs < busyEnd && slotEndMs > busyStart,
      );
      if (overlapsBusy) {
        continue;
      }

      slots.push(slotStart.toISOString());
    }

    return slots;
  }
}
