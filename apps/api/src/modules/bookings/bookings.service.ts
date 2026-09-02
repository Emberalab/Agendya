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
  RescheduleBookingInput,
} from '@agendya/types';
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

    // Parse comma-separated serviceIds
    const serviceIds = input.serviceIds.split(',').map((id) => id.trim());

    // Obtener todos los servicios seleccionados
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        professionalId: professional.id,
        isActive: true,
      },
    });
    if (services.length === 0) {
      throw new NotFoundException('Servicios no encontrados.');
    }
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Algunos servicios no están disponibles.');
    }

    // Calcular duración total y nombre combinado
    const totalDurationMinutes = services.reduce(
      (sum, s) => sum + s.durationMinutes,
      0,
    );
    const serviceNames = services.map((s) => s.name).join(' + ');
    const primaryServiceId = services[0].id;

    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
      throw new BadRequestException('Ese horario ya no está disponible.');
    }
    const endAt = new Date(startAt.getTime() + totalDurationMinutes * 60_000);

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
      minutesFromMidnight + totalDurationMinutes <= workingHour.endMinute;
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
      {
        id: primaryServiceId,
        name: serviceNames,
        durationMinutes: totalDurationMinutes,
      },
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
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        const isSerializationFailure =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!isSerializationFailure) {
          throw error;
        }
        if (attempt === maxAttempts) {
          throw new ConflictException('Ese horario ya no está disponible.');
        }
      }
    }
    throw new ConflictException('Ese horario ya no está disponible.');
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

  async reschedulePublicBooking(
    token: string,
    input: RescheduleBookingInput,
  ): Promise<PublicBooking> {
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
        `Solo puedes modificar con al menos ${booking.professional.cancellationPolicyHours} horas de anticipación.`,
      );
    }

    const newStartAt = new Date(input.newStartAt);
    if (
      Number.isNaN(newStartAt.getTime()) ||
      newStartAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('La nueva fecha debe ser en el futuro.');
    }

    const newEndAt = new Date(
      newStartAt.getTime() + booking.durationMinutesSnapshot * 60_000,
    );

    // Verificar que el nuevo horario no esté ocupado
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        professionalId: booking.professionalId,
        status: 'CONFIRMED',
        id: { not: booking.id },
        startAt: { lt: newEndAt },
        endAt: { gt: newStartAt },
      },
    });
    if (overlapping) {
      throw new ConflictException('El nuevo horario no está disponible.');
    }

    const oldStartAt = booking.startAt;
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        startAt: newStartAt,
        endAt: newEndAt,
      },
    });

    // Notificar al cliente
    await this.mailService.sendBookingRescheduled({
      to: booking.customerEmail,
      customerName: booking.customerName,
      businessName: booking.professional.businessName,
      serviceName: booking.serviceNameSnapshot,
      oldStartAt,
      newStartAt,
      timezone: booking.professional.timezone,
    });

    // Notificar al profesional
    await this.mailService.sendBookingRescheduledToProfessional({
      to: booking.professional.email,
      professionalName: booking.professional.businessName,
      customerName: booking.customerName,
      serviceName: booking.serviceNameSnapshot,
      oldStartAt,
      newStartAt,
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

    return bookings.map((booking) =>
      this.toAgendaBooking(booking, professional),
    );
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

    if (
      !this.canCancel(booking.startAt, professional.cancellationPolicyHours)
    ) {
      throw new ForbiddenException(
        `Solo puedes cancelar con al menos ${professional.cancellationPolicyHours} horas de anticipación.`,
      );
    }

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

    return this.toAgendaBooking(updated, professional);
  }

  async completeByProfessional(
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
      throw new ConflictException(
        'Solo puedes completar una reserva confirmada.',
      );
    }

    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
    });

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
    });

    return this.toAgendaBooking(updated, professional);
  }

  async rescheduleBooking(
    professionalId: string,
    bookingId: string,
    input: RescheduleBookingInput,
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

    if (
      !this.canCancel(booking.startAt, professional.cancellationPolicyHours)
    ) {
      throw new ForbiddenException(
        `Solo puedes modificar con al menos ${professional.cancellationPolicyHours} horas de anticipación.`,
      );
    }

    const newStartAt = new Date(input.newStartAt);
    if (
      Number.isNaN(newStartAt.getTime()) ||
      newStartAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('La nueva fecha debe ser en el futuro.');
    }

    const newEndAt = new Date(
      newStartAt.getTime() + booking.durationMinutesSnapshot * 60_000,
    );

    // Verificar que el nuevo horario no esté ocupado
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        professionalId,
        status: 'CONFIRMED',
        id: { not: bookingId },
        startAt: { lt: newEndAt },
        endAt: { gt: newStartAt },
      },
    });
    if (overlapping) {
      throw new ConflictException('El nuevo horario no está disponible.');
    }

    const oldStartAt = booking.startAt;
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        startAt: newStartAt,
        endAt: newEndAt,
      },
    });

    await this.mailService.sendBookingRescheduled({
      to: booking.customerEmail,
      customerName: booking.customerName,
      businessName: professional.businessName,
      serviceName: booking.serviceNameSnapshot,
      oldStartAt,
      newStartAt,
      timezone: professional.timezone,
    });

    return this.toAgendaBooking(updated, professional);
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
      professionalSlug: professional.slug,
      serviceId: booking.serviceId ?? '',
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

  private toAgendaBooking(
    booking: Booking,
    professional: Professional,
  ): AgendaBooking {
    return {
      id: booking.id,
      serviceId: booking.serviceId ?? '',
      serviceName: booking.serviceNameSnapshot,
      durationMinutes: booking.durationMinutesSnapshot,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
      cancellationPolicyHours: professional.cancellationPolicyHours,
      createdAt: booking.createdAt.toISOString(),
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancelledBy: booking.cancelledBy ?? null,
    };
  }
}
