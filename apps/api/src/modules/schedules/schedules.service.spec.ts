import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';

const activityService = {
  record: jest.fn().mockResolvedValue(undefined),
  recordDailyVisit: jest.fn().mockResolvedValue(undefined),
};
import { SchedulesService } from './schedules.service';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prisma: {
    workingHour: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    scheduleException: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    professional: { findUnique: jest.Mock };
    booking: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      workingHour: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      scheduleException: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      professional: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'prof-1', timezone: 'America/Bogota' }),
      },
      booking: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = moduleRef.get(SchedulesService);
  });

  describe('getWorkingHours', () => {
    it('maps working hours ordered by day', async () => {
      prisma.workingHour.findMany.mockResolvedValue([
        { id: 'wh-1', dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 },
      ]);

      const result = await service.getWorkingHours('prof-1');

      expect(prisma.workingHour.findMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1' },
        orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
      });
      expect(result).toEqual([
        { id: 'wh-1', dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 },
      ]);
    });
  });

  describe('setWorkingHours', () => {
    it('replaces the whole week in a single transaction', async () => {
      prisma.workingHour.findMany.mockResolvedValue([]);

      await service.setWorkingHours('prof-1', {
        days: [{ dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 }],
      });

      expect(prisma.workingHour.deleteMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1' },
      });
      expect(prisma.workingHour.createMany).toHaveBeenCalledWith({
        data: [
          {
            professionalId: 'prof-1',
            dayOfWeek: 'MONDAY',
            startMinute: 540,
            endMinute: 1080,
          },
        ],
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('persists several blocks for the same weekday', async () => {
      prisma.workingHour.findMany.mockResolvedValue([]);

      await service.setWorkingHours('prof-1', {
        days: [
          { dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 780 },
          { dayOfWeek: 'MONDAY', startMinute: 900, endMinute: 1080 },
        ],
      });

      expect(prisma.workingHour.createMany).toHaveBeenCalledWith({
        data: [
          {
            professionalId: 'prof-1',
            dayOfWeek: 'MONDAY',
            startMinute: 540,
            endMinute: 780,
          },
          {
            professionalId: 'prof-1',
            dayOfWeek: 'MONDAY',
            startMinute: 900,
            endMinute: 1080,
          },
        ],
      });
    });

    it('records the week before and after when the schedule changes', async () => {
      activityService.record.mockClear();
      prisma.workingHour.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'wh-2',
            dayOfWeek: 'MONDAY',
            startMinute: 900,
            endMinute: 1080,
          },
          { id: 'wh-1', dayOfWeek: 'MONDAY', startMinute: 480, endMinute: 720 },
        ]);

      await service.setWorkingHours('prof-1', {
        days: [
          { dayOfWeek: 'MONDAY', startMinute: 480, endMinute: 720 },
          { dayOfWeek: 'MONDAY', startMinute: 900, endMinute: 1080 },
        ],
      });

      expect(activityService.record).toHaveBeenCalledWith(
        'prof-1',
        'WORKING_HOURS_UPDATED',
        {
          entityType: 'WorkingHours',
          entityId: 'prof-1',
          metadata: {
            before: [],
            after: [
              {
                dayOfWeek: 'MONDAY',
                blocks: [
                  [480, 720],
                  [900, 1080],
                ],
              },
            ],
          },
        },
      );
    });

    it('records nothing when a save leaves the week unchanged', async () => {
      activityService.record.mockClear();
      const week = [
        { id: 'wh-1', dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 },
      ];
      prisma.workingHour.findMany.mockResolvedValue(week);

      await service.setWorkingHours('prof-1', {
        days: [{ dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 1080 }],
      });

      expect(activityService.record).not.toHaveBeenCalled();
    });
  });

  describe('createException', () => {
    it('creates an exception and formats the date back to yyyy-MM-dd', async () => {
      prisma.scheduleException.create.mockResolvedValue({
        id: 'exc-1',
        date: new Date('2026-08-15T00:00:00.000Z'),
        reason: 'Vacaciones',
      });

      const result = await service.createException('prof-1', {
        date: '2026-08-15',
        reason: 'Vacaciones',
      });

      expect(result).toEqual({
        id: 'exc-1',
        date: '2026-08-15',
        reason: 'Vacaciones',
        affectedBookingsCount: 0,
      });
    });

    it('reports how many confirmed bookings already exist on the blocked date, without touching them', async () => {
      // Business rule: blocking a date never cancels or otherwise modifies
      // bookings that already exist there — it only gates new bookings and
      // reschedules (see BookingsService.assertSlotWithinSchedule). This is
      // surfaced as a count for the UI, not acted on here.
      prisma.scheduleException.create.mockResolvedValue({
        id: 'exc-1',
        date: new Date('2026-08-15T00:00:00.000Z'),
        reason: null,
      });
      prisma.booking.count.mockResolvedValue(3);

      const result = await service.createException('prof-1', {
        date: '2026-08-15',
      });

      expect(result.affectedBookingsCount).toBe(3);
      expect(prisma.booking.count).toHaveBeenCalledWith({
        where: {
          professionalId: 'prof-1',
          status: 'CONFIRMED',
          startAt: { lt: expect.any(Date) as unknown },
          endAt: { gt: expect.any(Date) as unknown },
        },
      });
      // The service must never write to Booking as a side effect of blocking
      // a date.
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('translates a unique constraint violation into a conflict', async () => {
      prisma.scheduleException.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createException('prof-1', { date: '2026-08-15' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteException', () => {
    it('rejects deleting an exception that does not belong to the professional', async () => {
      prisma.scheduleException.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteException('prof-1', 'someone-elses-exception'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.scheduleException.delete).not.toHaveBeenCalled();
    });

    it('deletes an owned exception and records it', async () => {
      activityService.record.mockClear();
      prisma.scheduleException.findFirst.mockResolvedValue({
        id: 'exc-1',
        date: new Date('2026-08-15T00:00:00.000Z'),
      });

      await service.deleteException('prof-1', 'exc-1');

      expect(prisma.scheduleException.delete).toHaveBeenCalledWith({
        where: { id: 'exc-1' },
      });
      expect(activityService.record).toHaveBeenCalledWith(
        'prof-1',
        'SCHEDULE_EXCEPTION_DELETED',
        {
          entityType: 'ScheduleException',
          entityId: 'exc-1',
          subject: '2026-08-15',
          metadata: { date: '2026-08-15' },
        },
      );
    });
  });
});
