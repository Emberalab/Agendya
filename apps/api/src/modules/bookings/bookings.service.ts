import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Booking, Professional } from '@prisma/client';
import type {
  AgendaBooking,
  CreateBookingInput,
  PublicBooking,
} from '@ronda/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import {
  dateOnlyUtc,
  weekdayFromDateString,
  zonedDateParts,
  zonedInstant,
} from '../../common/utils/timezone.util';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createPublicBooking(
    slug: string,
    input: CreateBookingInput,
  ): Promise<PublicBooking> {
    const professional = await this.prisma.professional.findFirst({
      where: { slug, isActive: true },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: input.serviceId,
        professionalId: professional.id,
        isActive: true,
      },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado.');
    }

    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
      throw new BadRequestException('Ese horario ya no está disponible.');
    }
    const endAt = new Date(
      startAt.getTime() + service.durationMinutes * 60_000,
    );

    const { dateStr, minutesFromMidnight } = zonedDateParts(
      startAt,
      professional.timezone,
    );

    const workingHour = await this.prisma.workingHour.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId: professional.id,
          dayOfWeek: weekdayFromDateString(dateStr),
        },
      },
    });
    const fitsWorkingHours =
      workingHour !== null &&
      minutesFromMidnight >= workingHour.startMinute &&
      minutesFromMidnight + service.durationMinutes <= workingHour.endMinute;
    if (!fitsWorkingHours) {
      throw new ConflictException('Ese horario ya no está disponible.');
    }

    const exception = await this.prisma.scheduleException.findUnique({
      where: {
        professionalId_date: {
          professionalId: professional.id,
          date: dateOnlyUtc(dateStr),
        },
      },
    });
    if (exception) {
      throw new ConflictException('Ese horario ya no está disponible.');
    }

    const booking = await this.createConfirmedBooking(
      professional.id,
      service,
      input,
      startAt,
      endAt,
    );

    await this.mailService.sendBookingConfirmation({
      to: booking.customerEmail,
      customerName: booking.customerName,
      businessName: professional.businessName,
      serviceName: booking.serviceNameSnapshot,
      startAt: booking.startAt,
      timezone: professional.timezone,
      cancellationToken: booking.cancellationToken,
    });

    return this.toPublicBooking(booking, professional);
  }

  private async createConfirmedBooking(
    professionalId: string,
    service: { id: string; name: string; durationMinutes: number },
    input: CreateBookingInput,
    startAt: Date,
    endAt: Date,
  ): Promise<Booking> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const overlapping = await tx.booking.findFirst({
            where: {
              professionalId,
              status: 'CONFIRMED',
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
          });
          if (overlapping) {
            throw new ConflictException('Ese horario ya no está disponible.');
          }

          return tx.booking.create({
            data: {
              professionalId,
              serviceId: service.id,
              serviceNameSnapshot: service.name,
              durationMinutesSnapshot: service.durationMinutes,
              customerName: input.customerName,
              customerEmail: input.customerEmail,
              customerPhone: input.customerPhone,
              startAt,
              endAt,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException('Ese horario ya no está disponible.');
      }
      throw error;
    }
  }

  async getPublicBookingByToken(token: string): Promise<PublicBooking> {
    const booking = await this.prisma.booking.findUnique({
      where: { cancellationToken: token },
      include: { professional: true },
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    return this.toPublicBooking(booking, booking.professional);
  }

  async cancelPublicBooking(token: string): Promise<PublicBooking> {
    const booking = await this.prisma.booking.findUnique({
      where: { cancellationToken: token },
      include: { professional: true },
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (booking.status !== 'CONFIRMED') {
      throw new ConflictException('Esta reserva ya fue cancelada.');
    }
    if (
      !this.canCancel(
        booking.startAt,
        booking.professional.cancellationPolicyHours,
      )
    ) {
      throw new ForbiddenException(
        `Solo puedes cancelar con al menos ${booking.professional.cancellationPolicyHours} horas de anticipación.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'customer',
      },
    });

    await this.mailService.sendBookingCancelled({
      to: booking.customerEmail,
      customerName: booking.customerName,
      businessName: booking.professional.businessName,
      serviceName: booking.serviceNameSnapshot,
      startAt: booking.startAt,
      timezone: booking.professional.timezone,
    });

    return this.toPublicBooking(updated, booking.professional);
  }

  async listAgenda(
    professionalId: string,
    from: string,
    to: string,
  ): Promise<AgendaBooking[]> {
    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
    });
    const rangeStart = zonedInstant(from, 0, professional.timezone);
    const rangeEnd = zonedInstant(to, 24 * 60, professional.timezone);

    const bookings = await this.prisma.booking.findMany({
      where: { professionalId, startAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { startAt: 'asc' },
    });

    return bookings.map((booking) => this.toAgendaBooking(booking));
  }

  async cancelByProfessional(
    professionalId: string,
    bookingId: string,
  ): Promise<AgendaBooking> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, professionalId },
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    if (booking.status !== 'CONFIRMED') {
      throw new ConflictException('Esta reserva ya fue cancelada.');
    }

    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
    });

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'professional',
      },
    });

    await this.mailService.sendBookingCancelled({
      to: booking.customerEmail,
      customerName: booking.customerName,
      businessName: professional.businessName,
      serviceName: booking.serviceNameSnapshot,
      startAt: booking.startAt,
      timezone: professional.timezone,
    });

    return this.toAgendaBooking(updated);
  }

  private canCancel(startAt: Date, cancellationPolicyHours: number): boolean {
    const hoursUntilStart = (startAt.getTime() - Date.now()) / 3_600_000;
    return hoursUntilStart >= cancellationPolicyHours;
  }

  private toPublicBooking(
    booking: Booking,
    professional: Professional,
  ): PublicBooking {
    return {
      id: booking.id,
      businessName: professional.businessName,
      serviceName: booking.serviceNameSnapshot,
      durationMinutes: booking.durationMinutesSnapshot,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
      cancellationToken: booking.cancellationToken,
      cancellationPolicyHours: professional.cancellationPolicyHours,
      canCancel:
        booking.status === 'CONFIRMED' &&
        this.canCancel(booking.startAt, professional.cancellationPolicyHours),
    };
  }

  private toAgendaBooking(booking: Booking): AgendaBooking {
    return {
      id: booking.id,
      serviceName: booking.serviceNameSnapshot,
      durationMinutes: booking.durationMinutesSnapshot,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
    };
  }
}
