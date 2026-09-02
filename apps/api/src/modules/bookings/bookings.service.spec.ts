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
};

const CREATE_INPUT = {
  serviceId: 'service-1',
  startAt: '2026-08-03T14:00:00.000Z',
  customerName: 'Ana',
  customerEmail: 'ana@example.com',
  customerPhone: '+57 300 1234567',
};

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    professional: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock };
    service: { findFirst: jest.Mock };
    workingHour: { findUnique: jest.Mock };
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
  };
  let txBooking: { findFirst: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    txBooking = {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    prisma = {
      professional: {
        findFirst: jest.fn().mockResolvedValue(PROFESSIONAL),
        findUniqueOrThrow: jest.fn().mockResolvedValue(PROFESSIONAL),
      },
      service: { findFirst: jest.fn().mockResolvedValue(SERVICE) },
      workingHour: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ startMinute: 480, endMinute: 1080 }),
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
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
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
      prisma.service.findFirst.mockResolvedValue(null);

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
      prisma.workingHour.findUnique.mockResolvedValue(null);

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
        serviceName: 'Corte de cabello',
        durationMinutes: 30,
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        customerPhone: '+57 300 1234567',
        startAt: '2026-08-03T14:00:00.000Z',
        endAt: '2026-08-03T14:30:00.000Z',
        status: 'CONFIRMED',
        cancellationToken: 'token-abc',
        cancellationPolicyHours: 24,
        canCancel: true,
      });
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
  });

  describe('cancelPublicBooking', () => {
    const BASE_BOOKING = {
      id: 'booking-1',
      status: 'CONFIRMED',
      customerName: 'Ana',
      customerEmail: 'ana@example.com',
      serviceNameSnapshot: 'Corte de cabello',
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
  });
});
