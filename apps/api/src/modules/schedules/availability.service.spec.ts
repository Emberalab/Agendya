import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AvailabilityService } from './availability.service';

const PROFESSIONAL = { id: 'prof-1', timezone: 'America/Bogota' };
const SERVICE = {
  id: 'service-1',
  professionalId: 'prof-1',
  durationMinutes: 30,
  isActive: true,
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: {
    professional: { findUnique: jest.Mock };
    service: { findFirst: jest.Mock };
    workingHour: { findUnique: jest.Mock };
    scheduleException: { findUnique: jest.Mock };
    booking: { findMany: jest.Mock };
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      professional: { findUnique: jest.fn().mockResolvedValue(PROFESSIONAL) },
      service: { findFirst: jest.fn().mockResolvedValue(SERVICE) },
      workingHour: { findUnique: jest.fn() },
      scheduleException: { findUnique: jest.fn().mockResolvedValue(null) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
    };
    configService = { get: jest.fn().mockReturnValue(15) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AvailabilityService);

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2020-01-01T00:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws not found when the professional does not exist', async () => {
    prisma.professional.findUnique.mockResolvedValue(null);

    await expect(
      service.getAvailableSlots('missing', 'service-1', '2026-08-03'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws not found when the service does not belong to the professional or is inactive', async () => {
    prisma.service.findFirst.mockResolvedValue(null);

    await expect(
      service.getAvailableSlots('prof-1', 'missing-service', '2026-08-03'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns no slots on a rest day (no working hour configured)', async () => {
    prisma.workingHour.findUnique.mockResolvedValue(null);

    const slots = await service.getAvailableSlots(
      'prof-1',
      'service-1',
      '2026-08-03',
    );

    expect(slots).toEqual([]);
  });

  it('returns no slots when the date is blocked by a schedule exception', async () => {
    prisma.workingHour.findUnique.mockResolvedValue({
      startMinute: 540,
      endMinute: 720,
    });
    prisma.scheduleException.findUnique.mockResolvedValue({ id: 'exc-1' });

    const slots = await service.getAvailableSlots(
      'prof-1',
      'service-1',
      '2026-08-03',
    );

    expect(slots).toEqual([]);
  });

  it('generates slots on the configured grid within working hours', async () => {
    prisma.workingHour.findUnique.mockResolvedValue({
      startMinute: 540,
      endMinute: 720,
    });

    const slots = await service.getAvailableSlots(
      'prof-1',
      'service-1',
      '2026-08-03',
    );

    // 9:00–12:00 window, 30 min service, 15 min grid, Bogota is UTC-5 (fixed offset).
    expect(slots).toEqual([
      '2026-08-03T14:00:00.000Z',
      '2026-08-03T14:15:00.000Z',
      '2026-08-03T14:30:00.000Z',
      '2026-08-03T14:45:00.000Z',
      '2026-08-03T15:00:00.000Z',
      '2026-08-03T15:15:00.000Z',
      '2026-08-03T15:30:00.000Z',
      '2026-08-03T15:45:00.000Z',
      '2026-08-03T16:00:00.000Z',
      '2026-08-03T16:15:00.000Z',
      '2026-08-03T16:30:00.000Z',
    ]);
  });

  it('excludes slots that would overlap an existing confirmed booking', async () => {
    prisma.workingHour.findUnique.mockResolvedValue({
      startMinute: 540,
      endMinute: 720,
    });
    // Local 10:00–10:30 == 15:00–15:30 UTC in Bogota.
    prisma.booking.findMany.mockResolvedValue([
      {
        startAt: new Date('2026-08-03T15:00:00.000Z'),
        endAt: new Date('2026-08-03T15:30:00.000Z'),
      },
    ]);

    const slots = await service.getAvailableSlots(
      'prof-1',
      'service-1',
      '2026-08-03',
    );

    expect(slots).not.toContain('2026-08-03T14:45:00.000Z');
    expect(slots).not.toContain('2026-08-03T15:00:00.000Z');
    expect(slots).not.toContain('2026-08-03T15:15:00.000Z');
    expect(slots).toContain('2026-08-03T14:30:00.000Z');
    expect(slots).toContain('2026-08-03T15:30:00.000Z');
  });

  it('excludes slots that have already started relative to the current time', async () => {
    prisma.workingHour.findUnique.mockResolvedValue({
      startMinute: 540,
      endMinute: 720,
    });
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-08-03T14:20:00.000Z').getTime());

    const slots = await service.getAvailableSlots(
      'prof-1',
      'service-1',
      '2026-08-03',
    );

    expect(slots).not.toContain('2026-08-03T14:00:00.000Z');
    expect(slots).not.toContain('2026-08-03T14:15:00.000Z');
    expect(slots).toContain('2026-08-03T14:30:00.000Z');
  });
});
