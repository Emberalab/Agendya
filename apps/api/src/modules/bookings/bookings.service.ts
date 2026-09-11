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
  UpdateBookingInput,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  dateOnlyUtc,
  weekdayFromDateString,
  zonedDateParts,
  zonedInstant,
} from '../../common/utils/timezone.util';
import {
  isModifiable,
  isPast,
  meetsCancellationWindow,
} from './booking-policy';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
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

    const { primaryServiceId, serviceNames, totalDurationMinutes } =
      await this.resolveServiceSelection(professional.id, input);

    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime()) || isPast(startAt)) {
      throw new BadRequestException('Ese horario ya no está disponible.');
    }
    const endAt = new Date(startAt.getTime() + totalDurationMinutes * 60_000);

    await this.assertSlotWithinSchedule(
      professional,
      startAt,
      totalDurationMinutes,
    );

    const booking = await this.commitBookingSlot({
      professionalId: professional.id,
      service: {
        id: primaryServiceId,
        name: serviceNames,
        durationMinutes: totalDurationMinutes,
      },
      input,
      startAt,
      endAt,
    });

    // The booking is now durably persisted (the serializable transaction above
    // has committed). Only now do we record the notification — a professional
    // is never notified about a booking that failed to persist. This persists
    // the notification row and then delivers it over SSE. It already swallows
    // its own errors; the extra `.catch` keeps a persisted booking safe even
    // if that ever regresses.
    await this.notifications
      .notifyAppointmentCreated(professional, booking)
      .catch(() => undefined);

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

  /**
   * Lets a customer edit a confirmed booking in place via its cancellation
   * token: service, modality, date/time, and contact details. Reuses the same
   * validation and slot guards as {@link createPublicBooking}; no duplicate
   * booking is created.
   */
  async updatePublicBooking(
    token: string,
    input: UpdateBookingInput,
  ): Promise<PublicBooking> {
    const booking = await this.prisma.booking.findUnique({
      where: { cancellationToken: token },
      include: { professional: true },
    });
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }
    const { professional } = booking;
    await this.assertModifiable(booking, professional, 'modificar');

    const { primaryServiceId, serviceNames, totalDurationMinutes } =
      await this.resolveServiceSelection(professional.id, input);

    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime()) || isPast(startAt)) {
      throw new BadRequestException('Ese horario ya no está disponible.');
    }
    const endAt = new Date(startAt.getTime() + totalDurationMinutes * 60_000);

    await this.assertSlotWithinSchedule(
      professional,
      startAt,
      totalDurationMinutes,
    );

    const oldStartAt = booking.startAt;
    const updated = await this.commitBookingSlot({
      professionalId: professional.id,
      service: {
        id: primaryServiceId,
        name: serviceNames,
        durationMinutes: totalDurationMinutes,
      },
      input,
      startAt,
      endAt,
      existingBookingId: booking.id,
    });

    if (oldStartAt.getTime() !== startAt.getTime()) {
      await this.mailService.sendBookingRescheduled({
        to: updated.customerEmail,
        customerName: updated.customerName,
        businessName: professional.businessName,
        serviceName: updated.serviceNameSnapshot,
        oldStartAt,
        newStartAt: startAt,
        timezone: professional.timezone,
      });
      await this.mailService.sendBookingRescheduledToProfessional({
        to: professional.email,
        professionalName: professional.businessName,
        customerName: updated.customerName,
        serviceName: updated.serviceNameSnapshot,
        oldStartAt,
        newStartAt: startAt,
        timezone: professional.timezone,
      });
    } else {
      // Only the service, modality, or contact details changed — re-confirm
      // with the same token.
      await this.mailService.sendBookingConfirmation({
        to: updated.customerEmail,
        customerName: updated.customerName,
        businessName: professional.businessName,
        serviceName: updated.serviceNameSnapshot,
        startAt: updated.startAt,
        timezone: professional.timezone,
        cancellationToken: updated.cancellationToken,
      });
    }

    return this.toPublicBooking(updated, professional);
  }

  /**
   * Resolves the requested (comma-separated) services for a professional and
   * derives the combined name, duration, and primary id, applying the at-home
   * rules. Shared by the create and token-edit booking flows.
   */
  private async resolveServiceSelection(
    professionalId: string,
    input: CreateBookingInput,
  ): Promise<{
    primaryServiceId: string;
    serviceNames: string;
    totalDurationMinutes: number;
  }> {
    const serviceIds = input.serviceIds.split(',').map((id) => id.trim());

    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds }, professionalId, isActive: true },
    });
    if (services.length === 0) {
      throw new NotFoundException('Servicios no encontrados.');
    }
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Algunos servicios no están disponibles.');
    }

    const atHome = input.atHome ?? false;
    if (atHome) {
      if (!input.customerAddress) {
        throw new BadRequestException(
          'Ingresa la dirección para el servicio a domicilio.',
        );
      }
      if (services.some((s) => !s.homeServiceEnabled)) {
        throw new BadRequestException(
          'Este servicio no está disponible a domicilio.',
        );
      }
    }

    // A domicilio usa la duración configurada para ese servicio cuando existe.
    const totalDurationMinutes = services.reduce(
      (sum, s) =>
        sum +
        (atHome
          ? (s.homeDurationMinutes ?? s.durationMinutes)
          : s.durationMinutes),
      0,
    );

    return {
      primaryServiceId: services[0].id,
      serviceNames: services.map((s) => s.name).join(' + '),
      totalDurationMinutes,
    };
  }

  /**
   * Throws when the `startAt`..`startAt + durationMinutes` window does not fit
   * inside the professional's working hours for that day, or the day is blocked
   * by a schedule exception. Shared by every path that lands a booking on a
   * *new* slot — initial creation, the customer's token-edit flow, and both
   * reschedule flows — since a reschedule is, from the schedule's point of
   * view, indistinguishable from a new booking. A blocked date never touches
   * bookings that already occupy a slot (see SchedulesService.createException);
   * it only gates where a booking can move *to*.
   */
  private async assertSlotWithinSchedule(
    professional: Professional,
    startAt: Date,
    durationMinutes: number,
  ): Promise<void> {
    const { dateStr, minutesFromMidnight } = zonedDateParts(
      startAt,
      professional.timezone,
    );

    const workingBlocks = await this.prisma.workingHour.findMany({
      where: {
        professionalId: professional.id,
        dayOfWeek: weekdayFromDateString(dateStr),
      },
    });
    const fitsWorkingHours = workingBlocks.some(
      (block) =>
        minutesFromMidnight >= block.startMinute &&
        minutesFromMidnight + durationMinutes <= block.endMinute,
    );
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
  }

  /**
   * Writes a booking into a slot inside a serializable transaction that rejects
   * overlaps, retrying a few times on serialization failures. Creates a new
   * booking, or updates `existingBookingId` in place (excluding that row from
   * the overlap check) for the token-edit flow.
   */
  private async commitBookingSlot(params: {
    professionalId: string;
    service: { id: string; name: string; durationMinutes: number };
    input: CreateBookingInput;
    startAt: Date;
    endAt: Date;
    existingBookingId?: string;
  }): Promise<Booking> {
    const {
      professionalId,
      service,
      input,
      startAt,
      endAt,
      existingBookingId,
    } = params;

    const data = {
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      durationMinutesSnapshot: service.durationMinutes,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerNote: input.customerNote?.trim() || null,
      atHome: input.atHome ?? false,
      customerAddress: input.atHome ? (input.customerAddress ?? null) : null,
      startAt,
      endAt,
    };

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
                ...(existingBookingId
                  ? { id: { not: existingBookingId } }
                  : {}),
              },
            });
            if (overlapping) {
              throw new ConflictException('Ese horario ya no está disponible.');
            }

            if (existingBookingId) {
              return tx.booking.update({
                where: { id: existingBookingId },
                data,
              });
            }

            return tx.booking.create({
              data: { professionalId, ...data },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (!this.isSerializationConflict(error)) {
          throw error;
        }
        if (attempt === maxAttempts) {
          throw new ConflictException('Ese horario ya no está disponible.');
        }
      }
    }
    throw new ConflictException('Ese horario ya no está disponible.');
  }

  /**
   * A serializable transaction lost a read/write race and must be retried.
   * Depending on *when* Postgres detects the conflict, the driver-adapter
   * Prisma client surfaces this two different ways: as a
   * PrismaClientKnownRequestError P2034 (conflict caught mid-query), or as a
   * raw DriverAdapterError wrapping Postgres' own 40001 (conflict caught at
   * COMMIT — observed from two concurrent reschedules onto the same slot).
   * Both mean the same thing: retry.
   */
  private isSerializationConflict(error: unknown): boolean {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return true;
    }
    return (
      error instanceof Error &&
      error.name === 'DriverAdapterError' &&
      (error as { cause?: { kind?: string } }).cause?.kind ===
        'TransactionWriteConflict'
    );
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
    await this.assertModifiable(booking, booking.professional, 'cancelar');

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
    await this.assertModifiable(booking, booking.professional, 'modificar');

    const newStartAt = new Date(input.newStartAt);
    if (Number.isNaN(newStartAt.getTime()) || isPast(newStartAt)) {
      throw new BadRequestException('La nueva fecha debe ser en el futuro.');
    }

    const newEndAt = new Date(
      newStartAt.getTime() + booking.durationMinutesSnapshot * 60_000,
    );

    await this.assertSlotWithinSchedule(
      booking.professional,
      newStartAt,
      booking.durationMinutesSnapshot,
    );

    const oldStartAt = booking.startAt;
    const updated = await this.commitReschedule(
      booking.id,
      booking.professionalId,
      newStartAt,
      newEndAt,
    );

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

    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
    });

    await this.assertModifiable(booking, professional, 'cancelar');

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
    // A booking can still be marked complete after its slot has passed (the
    // professional forgot to close it out during the appointment) — but not
    // once it's already cancelled, completed, or marked as a no-show.
    if (booking.status !== 'CONFIRMED' && booking.status !== 'EXPIRED') {
      throw new ConflictException(
        'Solo puedes completar una reserva confirmada o vencida.',
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

    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
    });

    await this.assertModifiable(booking, professional, 'modificar');

    const newStartAt = new Date(input.newStartAt);
    if (Number.isNaN(newStartAt.getTime()) || isPast(newStartAt)) {
      throw new BadRequestException('La nueva fecha debe ser en el futuro.');
    }

    const newEndAt = new Date(
      newStartAt.getTime() + booking.durationMinutesSnapshot * 60_000,
    );

    await this.assertSlotWithinSchedule(
      professional,
      newStartAt,
      booking.durationMinutesSnapshot,
    );

    const oldStartAt = booking.startAt;
    const updated = await this.commitReschedule(
      bookingId,
      professionalId,
      newStartAt,
      newEndAt,
    );

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

  /**
   * The single server-side gate for cancelling/rescheduling a booking.
   * Re-fetched booking state is passed in by every caller (each of them
   * starts with a fresh `findFirst`/`findUnique`), so this always revalidates
   * against the current status and current time rather than a stale
   * client-supplied assumption — the concurrency-safety rule from the spec.
   *
   * Distinguishes *why* a booking can't be touched instead of collapsing
   * everything into one generic error: already cancelled/completed/no-show,
   * already vencida (expired — start time passed), or still confirmed but
   * inside the cancellation-policy window.
   *
   * Self-heals a stale CONFIRMED row whose start time has already passed by
   * flipping it to EXPIRED right here, instead of waiting for
   * ExpirationScheduler's next sweep — belt-and-suspenders with the cron.
   */
  private async assertModifiable(
    booking: Booking,
    professional: Professional,
    action: 'cancelar' | 'modificar',
  ): Promise<void> {
    if (booking.status === 'CANCELLED') {
      throw new ConflictException('Esta reserva ya fue cancelada.');
    }
    if (booking.status === 'COMPLETED') {
      throw new ConflictException('Esta reserva ya fue completada.');
    }
    if (booking.status === 'NO_SHOW') {
      throw new ConflictException('Esta reserva fue marcada como no asistida.');
    }

    if (booking.status === 'EXPIRED' || isPast(booking.startAt)) {
      if (booking.status === 'CONFIRMED') {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new ForbiddenException(
        'Esta reserva ya venció: su horario ya pasó y no puede modificarse.',
      );
    }

    if (
      !meetsCancellationWindow(
        booking.startAt,
        professional.cancellationPolicyHours,
      )
    ) {
      throw new ForbiddenException(
        `Solo puedes ${action} con al menos ${professional.cancellationPolicyHours} horas de anticipación.`,
      );
    }
  }

  /**
   * Applies a reschedule's overlap-check + update inside a serializable
   * transaction, retrying on serialization failures — same guard
   * {@link commitBookingSlot} uses, so two concurrent reschedules landing on
   * the same new slot can't both succeed.
   */
  private async commitReschedule(
    bookingId: string,
    professionalId: string,
    newStartAt: Date,
    newEndAt: Date,
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
                id: { not: bookingId },
                startAt: { lt: newEndAt },
                endAt: { gt: newStartAt },
              },
            });
            if (overlapping) {
              throw new ConflictException(
                'El nuevo horario no está disponible.',
              );
            }

            return tx.booking.update({
              where: { id: bookingId },
              data: { startAt: newStartAt, endAt: newEndAt },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (!this.isSerializationConflict(error)) {
          throw error;
        }
        if (attempt === maxAttempts) {
          throw new ConflictException('El nuevo horario no está disponible.');
        }
      }
    }
    throw new ConflictException('El nuevo horario no está disponible.');
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
      customerNote: booking.customerNote,
      atHome: booking.atHome,
      customerAddress: booking.customerAddress,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
      cancellationToken: booking.cancellationToken,
      cancellationPolicyHours: professional.cancellationPolicyHours,
      canCancel: isModifiable(booking, professional),
      canReschedule: isModifiable(booking, professional),
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
      customerNote: booking.customerNote,
      atHome: booking.atHome,
      // Only ever populated for an at-home booking; the column is null otherwise.
      customerAddress: booking.atHome ? booking.customerAddress : null,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
      cancellationPolicyHours: professional.cancellationPolicyHours,
      canReschedule: isModifiable(booking, professional),
      createdAt: booking.createdAt.toISOString(),
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancelledBy: booking.cancelledBy ?? null,
    };
  }
}
