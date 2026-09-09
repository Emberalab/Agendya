import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from './bookings.service';

const PROFESSIONAL = {
  id: 'prof-1',
  slug: 'maria-belleza',
  businessName: 'María Belleza',
  timezone: 'America/Bogota',
  cancellationPolicyHours: 24,
};

const SERVICE = {
  id: 'service-1',
  professionalId: 'prof-1',
  name: 'Corte de cabello',
  durationMinutes: 30,
  isActive: true,
  homeServiceEnabled: false,
  homeDurationMinutes: null,
  homePriceCents: null,
};

const CREATE_INPUT = {
  serviceIds: 'service-1',
  startAt: '2026-08-03T14:00:00.000Z',
  customerName: 'Ana',
  customerEmail: 'ana@example.com',
  customerPhone: '+57 300 1234567',
};

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    professional: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock };
    service: { findMany: jest.Mock };
    workingHour: { findMany: jest.Mock };
    scheduleException: { findUnique: jest.Mock };
    booking: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mailService: {
    sendBookingConfirmation: jest.Mock;
    sendBookingCancelled: jest.Mock;
    sendBookingReminder: jest.Mock;
    sendBookingRescheduled: jest.Mock;
    sendBookingRescheduledToProfessional: jest.Mock;
  };
  let txBooking: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let notificationsService: { notifyAppointmentCreated: jest.Mock };

  beforeEach(async () => {
    txBooking = {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    };
    prisma = {
      professional: {
        findFirst: jest.fn().mockResolvedValue(PROFESSIONAL),
        findUniqueOrThrow: jest.fn().mockResolvedValue(PROFESSIONAL),
      },
      service: { findMany: jest.fn().mockResolvedValue([SERVICE]) },
      workingHour: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ startMinute: 480, endMinute: 1080 }]),
      },
      scheduleException: { findUnique: jest.fn().mockResolvedValue(null) },
      booking: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => unknown) =>
          fn({ booking: txBooking }),
        ),
    };
    mailService = {
      sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
      sendBookingCancelled: jest.fn().mockResolvedValue(undefined),
      sendBookingReminder: jest.fn().mockResolvedValue(undefined),
      sendBookingRescheduled: jest.fn().mockResolvedValue(undefined),
      sendBookingRescheduledToProfessional: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    notificationsService = {
      notifyAppointmentCreated: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(BookingsService);

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-08-01T00:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createPublicBooking', () => {
    it('throws not found when the professional does not exist', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);

      await expect(
        service.createPublicBooking('missing', CREATE_INPUT),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws not found when the service does not belong to the professional or is inactive', async () => {
      prisma.service.findMany.mockResolvedValue([]);

      await expect(
        service.createPublicBooking('maria-belleza', CREATE_INPUT),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a slot in the past', async () => {
      await expect(
        service.createPublicBooking('maria-belleza', {
          ...CREATE_INPUT,
          startAt: '2020-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a slot outside the working hours', async () => {
      prisma.workingHour.findMany.mockResolvedValue([]);

      await expect(
        service.createPublicBooking('maria-belleza', CREATE_INPUT),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a slot on a date blocked by a schedule exception', async () => {
      prisma.scheduleException.findUnique.mockResolvedValue({ id: 'exc-1' });

      await expect(
        service.createPublicBooking('maria-belleza', CREATE_INPUT),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects when the slot overlaps an existing booking inside the transaction', async () => {
      txBooking.findFirst.mockResolvedValue({ id: 'existing-booking' });

      await expect(
        service.createPublicBooking('maria-belleza', CREATE_INPUT),
      ).rejects.toThrow(ConflictException);
      expect(txBooking.create).not.toHaveBeenCalled();
    });

    it('creates the booking and sends a confirmation email', async () => {
      const createdBooking = {
        id: 'booking-1',
        professionalId: 'prof-1',
        serviceId: 'service-1',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        customerPhone: '+57 300 1234567',
        customerNote: null,
        atHome: false,
        customerAddress: null,
        startAt: new Date('2026-08-03T14:00:00.000Z'),
        endAt: new Date('2026-08-03T14:30:00.000Z'),
        status: 'CONFIRMED',
        cancellationToken: 'token-abc',
      };
      txBooking.create.mockResolvedValue(createdBooking);

      const result = await service.createPublicBooking(
        'maria-belleza',
        CREATE_INPUT,
      );

      type CreateCall = [{ data: Record<string, unknown> }];
      const [[createArgs]] = txBooking.create.mock.calls as CreateCall[];
      expect(createArgs.data).toMatchObject({
        professionalId: 'prof-1',
        serviceId: 'service-1',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        customerPhone: '+57 300 1234567',
      });

      type ConfirmationCall = [{ to: string; cancellationToken: string }];
      const [[confirmationArgs]] = mailService.sendBookingConfirmation.mock
        .calls as ConfirmationCall[];
      expect(confirmationArgs.to).toBe('ana@example.com');
      expect(confirmationArgs.cancellationToken).toBe('token-abc');
      expect(result).toEqual({
        id: 'booking-1',
        businessName: 'María Belleza',
        professionalSlug: 'maria-belleza',
        serviceId: 'service-1',
        serviceName: 'Corte de cabello',
        durationMinutes: 30,
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        customerPhone: '+57 300 1234567',
        customerNote: null,
        atHome: false,
        customerAddress: null,
        startAt: '2026-08-03T14:00:00.000Z',
        endAt: '2026-08-03T14:30:00.000Z',
        status: 'CONFIRMED',
        cancellationToken: 'token-abc',
        cancellationPolicyHours: 24,
        canCancel: true,
        canReschedule: true,
      });
    });

    it('books an at-home service using its home duration and stores the address', async () => {
      prisma.service.findMany.mockResolvedValue([
        {
          ...SERVICE,
          homeServiceEnabled: true,
          homeDurationMinutes: 45,
          homePriceCents: 5000000,
        },
      ]);
      txBooking.create.mockResolvedValue({
        id: 'booking-2',
        professionalId: 'prof-1',
        serviceId: 'service-1',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        customerPhone: '+57 300 1234567',
        customerNote: null,
        atHome: true,
        customerAddress: 'Calle 10 # 20-30',
        startAt: new Date('2026-08-03T14:00:00.000Z'),
        endAt: new Date('2026-08-03T14:45:00.000Z'),
        status: 'CONFIRMED',
        cancellationToken: 'token-def',
      });

      const result = await service.createPublicBooking('maria-belleza', {
        ...CREATE_INPUT,
        atHome: true,
        customerAddress: 'Calle 10 # 20-30',
      });

      type CreateCall = [{ data: Record<string, unknown> }];
      const [[createArgs]] = txBooking.create.mock.calls as CreateCall[];
      expect(createArgs.data).toMatchObject({
        atHome: true,
        customerAddress: 'Calle 10 # 20-30',
      });
      expect(result.atHome).toBe(true);
      expect(result.customerAddress).toBe('Calle 10 # 20-30');
      expect(result.endAt).toBe('2026-08-03T14:45:00.000Z');
    });

    it('rejects an at-home booking for a service without home service enabled', async () => {
      await expect(
        service.createPublicBooking('maria-belleza', {
          ...CREATE_INPUT,
          atHome: true,
          customerAddress: 'Calle 10 # 20-30',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an at-home booking without an address', async () => {
      await expect(
        service.createPublicBooking('maria-belleza', {
          ...CREATE_INPUT,
          atHome: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('translates a serialization failure into a conflict', async () => {
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('could not serialize access', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createPublicBooking('maria-belleza', CREATE_INPUT),
      ).rejects.toThrow(ConflictException);
    });

    it("emits appointment.created to the booking's professional with only display fields", async () => {
      txBooking.create.mockResolvedValue({
        id: 'booking-1',
        professionalId: 'prof-1',
        serviceId: 'service-1',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        customerPhone: '+57 300 1234567',
        customerNote: null,
        atHome: false,
        customerAddress: null,
        startAt: new Date('2026-08-03T14:00:00.000Z'),
        endAt: new Date('2026-08-03T14:30:00.000Z'),
        status: 'CONFIRMED',
        cancellationToken: 'token-abc',
      });

      await service.createPublicBooking('maria-belleza', CREATE_INPUT);

      expect(
        notificationsService.notifyAppointmentCreated,
      ).toHaveBeenCalledTimes(1);
      const [professionalArg, bookingArg] = notificationsService
        .notifyAppointmentCreated.mock.calls[0] as [
        { id: string },
        { id: string },
      ];
      expect(professionalArg.id).toBe('prof-1');
      expect(bookingArg.id).toBe('booking-1');
    });

    it('does not record a notification when the booking transaction fails', async () => {
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('could not serialize access', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createPublicBooking('maria-belleza', CREATE_INPUT),
      ).rejects.toThrow(ConflictException);
      expect(
        notificationsService.notifyAppointmentCreated,
      ).not.toHaveBeenCalled();
    });

    it('still returns the booking when notification delivery rejects', async () => {
      txBooking.create.mockResolvedValue({
        id: 'booking-1',
        professionalId: 'prof-1',
        serviceId: 'service-1',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        customerPhone: '+57 300 1234567',
        customerNote: null,
        atHome: false,
        customerAddress: null,
        startAt: new Date('2026-08-03T14:00:00.000Z'),
        endAt: new Date('2026-08-03T14:30:00.000Z'),
        status: 'CONFIRMED',
        cancellationToken: 'token-abc',
      });
      notificationsService.notifyAppointmentCreated.mockRejectedValue(
        new Error('stream boom'),
      );

      const result = await service.createPublicBooking(
        'maria-belleza',
        CREATE_INPUT,
      );

      expect(result.id).toBe('booking-1');
      expect(mailService.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePublicBooking', () => {
    const EXISTING_BOOKING = {
      id: 'booking-1',
      professionalId: 'prof-1',
      status: 'CONFIRMED',
      serviceId: 'service-1',
      serviceNameSnapshot: 'Corte de cabello',
      durationMinutesSnapshot: 30,
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      customerNote: null,
      atHome: false,
      customerAddress: null,
      cancellationToken: 'token-abc',
      startAt: new Date('2026-08-10T14:00:00.000Z'),
      endAt: new Date('2026-08-10T14:30:00.000Z'),
      professional: { ...PROFESSIONAL, email: 'pro@example.com' },
    };

    const UPDATE_INPUT = {
      serviceIds: 'service-1',
      startAt: '2026-08-10T14:00:00.000Z',
      customerName: 'Ana Actualizada',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
    };

    const updatedRow = (overrides: Record<string, unknown> = {}) => ({
      ...EXISTING_BOOKING,
      customerName: 'Ana Actualizada',
      ...overrides,
    });

    it('throws not found for an unknown token', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePublicBooking('missing-token', UPDATE_INPUT),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects editing an already-cancelled booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...EXISTING_BOOKING,
        status: 'CANCELLED',
      });

      await expect(
        service.updatePublicBooking('token-abc', UPDATE_INPUT),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects editing within the cancellation policy window', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...EXISTING_BOOKING,
        startAt: new Date('2026-08-01T10:00:00.000Z'),
      });

      await expect(
        service.updatePublicBooking('token-abc', UPDATE_INPUT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a new slot outside the working hours', async () => {
      prisma.booking.findUnique.mockResolvedValue(EXISTING_BOOKING);
      prisma.workingHour.findMany.mockResolvedValue([]);

      await expect(
        service.updatePublicBooking('token-abc', UPDATE_INPUT),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects when the new slot overlaps another booking (excluding itself)', async () => {
      prisma.booking.findUnique.mockResolvedValue(EXISTING_BOOKING);
      txBooking.findFirst.mockResolvedValue({ id: 'other-booking' });

      await expect(
        service.updatePublicBooking('token-abc', UPDATE_INPUT),
      ).rejects.toThrow(ConflictException);
      expect(txBooking.update).not.toHaveBeenCalled();

      type OverlapCall = [{ where: Record<string, unknown> }];
      const [[overlapArgs]] = txBooking.findFirst.mock.calls as OverlapCall[];
      expect(overlapArgs.where).toMatchObject({ id: { not: 'booking-1' } });
    });

    it('updates the booking in place and re-confirms when the time is unchanged', async () => {
      prisma.booking.findUnique.mockResolvedValue(EXISTING_BOOKING);
      txBooking.update.mockResolvedValue(updatedRow());

      const result = await service.updatePublicBooking(
        'token-abc',
        UPDATE_INPUT,
      );

      type UpdateCall = [
        { where: { id: string }; data: Record<string, unknown> },
      ];
      const [[updateArgs]] = txBooking.update.mock.calls as UpdateCall[];
      expect(updateArgs.where).toEqual({ id: 'booking-1' });
      expect(updateArgs.data).toMatchObject({
        serviceId: 'service-1',
        customerName: 'Ana Actualizada',
      });
      expect(txBooking.create).not.toHaveBeenCalled();
      expect(mailService.sendBookingConfirmation).toHaveBeenCalledTimes(1);
      expect(mailService.sendBookingRescheduled).not.toHaveBeenCalled();
      expect(result.cancellationToken).toBe('token-abc');
      expect(result.customerName).toBe('Ana Actualizada');
    });

    it('notifies both parties when the time changes', async () => {
      prisma.booking.findUnique.mockResolvedValue(EXISTING_BOOKING);
      const newStartAt = new Date('2026-08-11T15:00:00.000Z');
      txBooking.update.mockResolvedValue(
        updatedRow({
          startAt: newStartAt,
          endAt: new Date('2026-08-11T15:30:00.000Z'),
        }),
      );

      await service.updatePublicBooking('token-abc', {
        ...UPDATE_INPUT,
        startAt: '2026-08-11T15:00:00.000Z',
      });

      expect(mailService.sendBookingRescheduled).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBookingRescheduledToProfessional,
      ).toHaveBeenCalledTimes(1);
      expect(mailService.sendBookingConfirmation).not.toHaveBeenCalled();

      type RescheduledCall = [{ oldStartAt: Date; newStartAt: Date }];
      const [[args]] = mailService.sendBookingRescheduled.mock
        .calls as RescheduledCall[];
      expect(args.oldStartAt).toEqual(new Date('2026-08-10T14:00:00.000Z'));
      expect(args.newStartAt).toEqual(newStartAt);
    });

    it('switches to an at-home modality with its home duration and address', async () => {
      prisma.booking.findUnique.mockResolvedValue(EXISTING_BOOKING);
      prisma.service.findMany.mockResolvedValue([
        { ...SERVICE, homeServiceEnabled: true, homeDurationMinutes: 45 },
      ]);
      txBooking.update.mockResolvedValue(
        updatedRow({
          atHome: true,
          customerAddress: 'Calle 10 # 20-30',
          durationMinutesSnapshot: 45,
          endAt: new Date('2026-08-10T14:45:00.000Z'),
        }),
      );

      const result = await service.updatePublicBooking('token-abc', {
        ...UPDATE_INPUT,
        atHome: true,
        customerAddress: 'Calle 10 # 20-30',
      });

      type UpdateCall = [{ data: Record<string, unknown> }];
      const [[updateArgs]] = txBooking.update.mock.calls as UpdateCall[];
      expect(updateArgs.data).toMatchObject({
        atHome: true,
        customerAddress: 'Calle 10 # 20-30',
        durationMinutesSnapshot: 45,
      });
      expect(result.atHome).toBe(true);
    });
  });

  describe('cancelPublicBooking', () => {
    const BASE_BOOKING = {
      id: 'booking-1',
      status: 'CONFIRMED',
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      customerNote: null,
      serviceNameSnapshot: 'Corte de cabello',
      durationMinutesSnapshot: 30,
      atHome: false,
      customerAddress: null,
      cancellationToken: 'token-abc',
      startAt: new Date('2026-08-10T14:00:00.000Z'),
      endAt: new Date('2026-08-10T14:30:00.000Z'),
      professional: PROFESSIONAL,
    };

    it('throws not found for an unknown token', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelPublicBooking('missing-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects cancelling an already-cancelled booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...BASE_BOOKING,
        status: 'CANCELLED',
      });

      await expect(service.cancelPublicBooking('token-abc')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects cancelling within the cancellation policy window', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...BASE_BOOKING,
        startAt: new Date('2026-08-01T10:00:00.000Z'), // 10h from mocked "now", policy requires 24h
      });

      await expect(service.cancelPublicBooking('token-abc')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('cancels the booking and notifies the customer', async () => {
      prisma.booking.findUnique.mockResolvedValue(BASE_BOOKING);
      prisma.booking.update.mockResolvedValue({
        ...BASE_BOOKING,
        status: 'CANCELLED',
      });

      const result = await service.cancelPublicBooking('token-abc');

      type UpdateCall = [
        { where: { id: string }; data: Record<string, unknown> },
      ];
      const [[updateArgs]] = prisma.booking.update.mock.calls as UpdateCall[];
      expect(updateArgs.where).toEqual({ id: 'booking-1' });
      expect(updateArgs.data).toMatchObject({
        status: 'CANCELLED',
        cancelledBy: 'customer',
      });

      type CancelledCall = [{ to: string }];
      const [[cancelledArgs]] = mailService.sendBookingCancelled.mock
        .calls as CancelledCall[];
      expect(cancelledArgs.to).toBe('ana@example.com');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('listAgenda', () => {
    it('queries bookings within the professional-local date range', async () => {
      await service.listAgenda('prof-1', '2026-08-03', '2026-08-03');

      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: 'prof-1',
          startAt: {
            gte: new Date('2026-08-03T05:00:00.000Z'),
            lt: new Date('2026-08-04T05:00:00.000Z'),
          },
        },
        orderBy: { startAt: 'asc' },
      });
    });

    it('exposes the customer note on each agenda booking', async () => {
      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'booking-1',
          serviceId: 'service-1',
          serviceNameSnapshot: 'Corte de cabello',
          durationMinutesSnapshot: 30,
          customerName: 'Ana',
          customerEmail: 'ana@example.com',
          customerPhone: '+57 300 1234567',
          customerNote: 'Llego 5 minutos tarde',
          startAt: new Date('2026-08-03T14:00:00.000Z'),
          endAt: new Date('2026-08-03T14:30:00.000Z'),
          status: 'CONFIRMED',
          createdAt: new Date('2026-07-30T10:00:00.000Z'),
          cancelledAt: null,
          cancelledBy: null,
        },
      ]);

      const [booking] = await service.listAgenda(
        'prof-1',
        '2026-08-03',
        '2026-08-03',
      );

      expect(booking.customerNote).toBe('Llego 5 minutos tarde');
    });
  });

  describe('cancelByProfessional', () => {
    it('rejects cancelling a booking that does not belong to the professional', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelByProfessional('prof-1', 'someone-elses-booking'),
      ).rejects.toThrow(NotFoundException);
    });

    it('cancels and marks cancelledBy as professional', async () => {
      const bookingRow = {
        id: 'booking-1',
        status: 'CONFIRMED',
        customerEmail: 'ana@example.com',
        customerName: 'Ana',
        customerPhone: '+57 300 1234567',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        startAt: new Date('2026-08-10T14:00:00.000Z'),
        endAt: new Date('2026-08-10T14:30:00.000Z'),
        createdAt: new Date('2026-07-30T10:00:00.000Z'),
        cancelledAt: null,
        cancelledBy: null,
      };
      prisma.booking.findFirst.mockResolvedValue(bookingRow);
      prisma.booking.update.mockResolvedValue({
        ...bookingRow,
        status: 'CANCELLED',
      });

      await service.cancelByProfessional('prof-1', 'booking-1');

      type UpdateCall = [
        { where: { id: string }; data: Record<string, unknown> },
      ];
      const [[updateArgs]] = prisma.booking.update.mock.calls as UpdateCall[];
      expect(updateArgs.where).toEqual({ id: 'booking-1' });
      expect(updateArgs.data).toMatchObject({ cancelledBy: 'professional' });
    });

    it('rejects cancelling a booking whose start time has already passed (previous day)', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'CONFIRMED',
        customerEmail: 'ana@example.com',
        customerName: 'Ana',
        customerPhone: '+57 300 1234567',
        serviceNameSnapshot: 'Corte de cabello',
        startAt: new Date('2026-07-31T10:00:00.000Z'),
        endAt: new Date('2026-07-31T10:30:00.000Z'),
      });

      await expect(
        service.cancelByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancelling within the cancellation policy window', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'CONFIRMED',
        customerEmail: 'ana@example.com',
        customerName: 'Ana',
        customerPhone: '+57 300 1234567',
        serviceNameSnapshot: 'Corte de cabello',
        startAt: new Date('2026-08-01T10:00:00.000Z'), // 10h out, policy requires 24h
        endAt: new Date('2026-08-01T10:30:00.000Z'),
      });

      await expect(
        service.cancelByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancelling an already-completed booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
        startAt: new Date('2026-09-01T10:00:00.000Z'),
      });

      await expect(
        service.cancelByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects cancelling an already-expired booking without a second status write', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'EXPIRED',
        startAt: new Date('2026-07-31T10:00:00.000Z'),
      });

      await expect(
        service.cancelByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('self-heals a stale CONFIRMED booking to EXPIRED the moment it is touched', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'CONFIRMED',
        startAt: new Date('2026-07-31T10:00:00.000Z'),
        endAt: new Date('2026-07-31T10:30:00.000Z'),
      });

      await expect(
        service.cancelByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('completeByProfessional', () => {
    const BOOKING_ROW = {
      id: 'booking-1',
      status: 'CONFIRMED',
      serviceId: 'service-1',
      serviceNameSnapshot: 'Corte de cabello',
      durationMinutesSnapshot: 30,
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      startAt: new Date('2026-07-31T10:00:00.000Z'),
      endAt: new Date('2026-07-31T10:30:00.000Z'),
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      cancelledAt: null,
      cancelledBy: null,
    };

    it('rejects completing a booking that does not belong to the professional', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.completeByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects completing an already-cancelled booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...BOOKING_ROW,
        status: 'CANCELLED',
      });

      await expect(
        service.completeByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('completes a still-confirmed booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(BOOKING_ROW);
      prisma.booking.update.mockResolvedValue({
        ...BOOKING_ROW,
        status: 'COMPLETED',
      });

      const result = await service.completeByProfessional(
        'prof-1',
        'booking-1',
      );

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'COMPLETED' },
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('allows completing an EXPIRED booking (marking it after the fact)', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...BOOKING_ROW,
        status: 'EXPIRED',
      });
      prisma.booking.update.mockResolvedValue({
        ...BOOKING_ROW,
        status: 'COMPLETED',
      });

      const result = await service.completeByProfessional(
        'prof-1',
        'booking-1',
      );

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('reschedulePublicBooking', () => {
    const BASE_BOOKING = {
      id: 'booking-1',
      professionalId: 'prof-1',
      status: 'CONFIRMED',
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      serviceNameSnapshot: 'Corte de cabello',
      durationMinutesSnapshot: 30,
      cancellationToken: 'token-abc',
      startAt: new Date('2026-08-10T14:00:00.000Z'),
      endAt: new Date('2026-08-10T14:30:00.000Z'),
      professional: { ...PROFESSIONAL, email: 'pro@example.com' },
    };

    it('throws not found for an unknown token', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.reschedulePublicBooking('missing-token', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects rescheduling an already-cancelled booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...BASE_BOOKING,
        status: 'CANCELLED',
      });

      await expect(
        service.reschedulePublicBooking('token-abc', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects rescheduling a booking already marked completed', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...BASE_BOOKING,
        status: 'COMPLETED',
      });

      await expect(
        service.reschedulePublicBooking('token-abc', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects rescheduling a booking whose start time has passed (previous day)', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...BASE_BOOKING,
        startAt: new Date('2026-07-31T10:00:00.000Z'),
        endAt: new Date('2026-07-31T10:30:00.000Z'),
      });

      await expect(
        service.reschedulePublicBooking('token-abc', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects rescheduling within the cancellation policy window', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...BASE_BOOKING,
        startAt: new Date('2026-08-01T10:00:00.000Z'), // 10h out, policy requires 24h
        endAt: new Date('2026-08-01T10:30:00.000Z'),
      });

      await expect(
        service.reschedulePublicBooking('token-abc', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a new time that is itself in the past', async () => {
      prisma.booking.findUnique.mockResolvedValue(BASE_BOOKING);

      await expect(
        service.reschedulePublicBooking('token-abc', {
          newStartAt: '2020-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the new slot overlaps another booking, inside the transaction', async () => {
      prisma.booking.findUnique.mockResolvedValue(BASE_BOOKING);
      txBooking.findFirst.mockResolvedValue({ id: 'other-booking' });

      await expect(
        service.reschedulePublicBooking('token-abc', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
      expect(txBooking.update).not.toHaveBeenCalled();
    });

    it('reschedules inside a serializable transaction and notifies both parties', async () => {
      prisma.booking.findUnique.mockResolvedValue(BASE_BOOKING);
      const newStartAt = new Date('2026-08-11T15:00:00.000Z');
      const newEndAt = new Date('2026-08-11T15:30:00.000Z');
      txBooking.update.mockResolvedValue({
        ...BASE_BOOKING,
        startAt: newStartAt,
        endAt: newEndAt,
      });

      const result = await service.reschedulePublicBooking('token-abc', {
        newStartAt: '2026-08-11T15:00:00.000Z',
      });

      expect(txBooking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { startAt: newStartAt, endAt: newEndAt },
      });
      expect(mailService.sendBookingRescheduled).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBookingRescheduledToProfessional,
      ).toHaveBeenCalledTimes(1);
      expect(result.startAt).toBe('2026-08-11T15:00:00.000Z');
    });

    it('translates a serialization failure on the new slot into a conflict', async () => {
      prisma.booking.findUnique.mockResolvedValue(BASE_BOOKING);
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('could not serialize access', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.reschedulePublicBooking('token-abc', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('rescheduleBooking (staff-side)', () => {
    const BOOKING_ROW = {
      id: 'booking-1',
      professionalId: 'prof-1',
      status: 'CONFIRMED',
      serviceId: 'service-1',
      customerEmail: 'ana@example.com',
      customerName: 'Ana',
      customerPhone: '+57 300 1234567',
      serviceNameSnapshot: 'Corte de cabello',
      durationMinutesSnapshot: 30,
      startAt: new Date('2026-08-10T14:00:00.000Z'),
      endAt: new Date('2026-08-10T14:30:00.000Z'),
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      cancelledAt: null,
      cancelledBy: null,
    };

    it('rejects rescheduling a booking that does not belong to the professional', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.rescheduleBooking('prof-1', 'booking-1', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects rescheduling a booking from a previous day', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...BOOKING_ROW,
        startAt: new Date('2026-07-31T10:00:00.000Z'),
        endAt: new Date('2026-07-31T10:30:00.000Z'),
      });

      await expect(
        service.rescheduleBooking('prof-1', 'booking-1', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects rescheduling an already-expired booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...BOOKING_ROW,
        status: 'EXPIRED',
      });

      await expect(
        service.rescheduleBooking('prof-1', 'booking-1', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a new time in the past', async () => {
      prisma.booking.findFirst.mockResolvedValue(BOOKING_ROW);

      await expect(
        service.rescheduleBooking('prof-1', 'booking-1', {
          newStartAt: '2020-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the new slot overlaps another booking', async () => {
      prisma.booking.findFirst.mockResolvedValue(BOOKING_ROW);
      txBooking.findFirst.mockResolvedValue({ id: 'other-booking' });

      await expect(
        service.rescheduleBooking('prof-1', 'booking-1', {
          newStartAt: '2026-08-11T15:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('reschedules inside a transaction and notifies only the customer', async () => {
      prisma.booking.findFirst.mockResolvedValue(BOOKING_ROW);
      const newStartAt = new Date('2026-08-11T15:00:00.000Z');
      const newEndAt = new Date('2026-08-11T15:30:00.000Z');
      txBooking.update.mockResolvedValue({
        ...BOOKING_ROW,
        startAt: newStartAt,
        endAt: newEndAt,
      });

      await service.rescheduleBooking('prof-1', 'booking-1', {
        newStartAt: '2026-08-11T15:00:00.000Z',
      });

      expect(mailService.sendBookingRescheduled).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBookingRescheduledToProfessional,
      ).not.toHaveBeenCalled();
    });
  });

  describe('reschedule/cancel guards compare absolute instants, not date strings', () => {
    it('rejects a booking earlier the same UTC calendar day once its instant has elapsed', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-08-01T23:30:00.000Z').getTime());
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'CONFIRMED',
        customerEmail: 'ana@example.com',
        customerName: 'Ana',
        customerPhone: '+57 300 1234567',
        serviceNameSnapshot: 'Corte de cabello',
        // Same UTC calendar date as "now" (2026-08-01), but 30 minutes earlier
        // — a date-only compare would call this "today", not "past".
        startAt: new Date('2026-08-01T23:00:00.000Z'),
        endAt: new Date('2026-08-01T23:30:00.000Z'),
      });

      await expect(
        service.cancelByProfessional('prof-1', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows modifying a booking minutes away even when it crosses into the next UTC calendar day', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-08-01T23:50:00.000Z').getTime());
      prisma.professional.findUniqueOrThrow.mockResolvedValue({
        ...PROFESSIONAL,
        cancellationPolicyHours: 0,
      });
      prisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        professionalId: 'prof-1',
        status: 'CONFIRMED',
        serviceId: 'service-1',
        customerEmail: 'ana@example.com',
        customerName: 'Ana',
        customerPhone: '+57 300 1234567',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        // "Aug 2" in UTC, only 20 minutes after mocked "now" ("Aug 1").
        startAt: new Date('2026-08-02T00:10:00.000Z'),
        endAt: new Date('2026-08-02T00:40:00.000Z'),
        createdAt: new Date('2026-07-30T10:00:00.000Z'),
        cancelledAt: null,
        cancelledBy: null,
      });
      const newStartAt = new Date('2026-08-03T10:00:00.000Z');
      txBooking.update.mockResolvedValue({
        id: 'booking-1',
        professionalId: 'prof-1',
        status: 'CONFIRMED',
        serviceId: 'service-1',
        customerEmail: 'ana@example.com',
        customerName: 'Ana',
        customerPhone: '+57 300 1234567',
        serviceNameSnapshot: 'Corte de cabello',
        durationMinutesSnapshot: 30,
        startAt: newStartAt,
        endAt: new Date('2026-08-03T10:30:00.000Z'),
        createdAt: new Date('2026-07-30T10:00:00.000Z'),
        cancelledAt: null,
        cancelledBy: null,
      });

      const result = await service.rescheduleBooking('prof-1', 'booking-1', {
        newStartAt: '2026-08-03T10:00:00.000Z',
      });

      expect(result.status).toBe('CONFIRMED');
    });
  });
});
