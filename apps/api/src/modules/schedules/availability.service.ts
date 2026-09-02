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
    serviceIds: string[],
    dateStr: string,
  ): Promise<string[]> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    // Obtener todos los servicios seleccionados
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        professionalId,
        isActive: true,
      },
    });
    if (services.length === 0) {
      throw new NotFoundException('Servicios no encontrados.');
    }
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Algunos servicios no están disponibles.');
    }

    // Calcular duración total de todos los servicios
    const totalDurationMinutes = services.reduce(
      (sum, service) => sum + service.durationMinutes,
      0,
    );

    const workingBlocks = await this.prisma.workingHour.findMany({
      where: {
        professionalId,
        dayOfWeek: weekdayFromDateString(dateStr),
      },
      orderBy: { startMinute: 'asc' },
    });
    if (workingBlocks.length === 0) {
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

    for (const block of workingBlocks) {
      for (
        let start = block.startMinute;
        start + totalDurationMinutes <= block.endMinute;
        start += gridMinutes
      ) {
        const slotStart = zonedInstant(dateStr, start, professional.timezone);
        const slotStartMs = slotStart.getTime();
        if (slotStartMs <= now) {
          continue;
        }

        const slotEndMs = slotStartMs + totalDurationMinutes * 60_000;
        const overlapsBusy = busyRanges.some(
          ([busyStart, busyEnd]) =>
            slotStartMs < busyEnd && slotEndMs > busyStart,
        );
        if (overlapsBusy) {
          continue;
        }

        slots.push(slotStart.toISOString());
      }
    }

    return slots;
  }
}
