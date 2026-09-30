import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import {
  TRIAL_EXPIRY_SWEEP_LOOKBACK_DAYS,
  TrialExpiryScheduler,
} from './trial-expiry.scheduler';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-01T16:00:00.000Z');

describe('TrialExpiryScheduler', () => {
  let scheduler: TrialExpiryScheduler;
  let prisma: {
    professional: { findMany: jest.Mock; findUniqueOrThrow: jest.Mock };
    service: {
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          plan: 'FREE',
          trialStartedAt: new Date(NOW.getTime() - 30 * DAY),
          trialEndsAt: new Date(NOW.getTime() - 60_000),
        }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TrialExpiryScheduler,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    scheduler = moduleRef.get(TrialExpiryScheduler);
  });

  afterEach(() => {
    delete process.env.DISABLE_SCHEDULED_JOBS;
  });

  it('looks only at trials that ended within the lookback window', async () => {
    await scheduler.sweep(NOW);
    expect(prisma.professional.findMany).toHaveBeenCalledWith({
      where: {
        trialEndsAt: {
          lte: NOW,
          gt: new Date(NOW.getTime() - TRIAL_EXPIRY_SWEEP_LOOKBACK_DAYS * DAY),
        },
      },
      select: { id: true },
    });
  });

  it('locks services over the FREE limit after expiry without deleting anything', async () => {
    prisma.professional.findMany.mockResolvedValue([{ id: 'prof-1' }]);
    prisma.service.findMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`,
        planLocked: false,
        planEnabledAt: new Date(),
      })),
    );

    await scheduler.sweep(NOW);

    expect(prisma.service.updateMany).toHaveBeenCalledWith({
      where: { id: { in: Array.from({ length: 17 }, (_, i) => `s${i + 3}`) } },
      data: { planLocked: true },
    });
    expect(prisma.service.delete).not.toHaveBeenCalled();
    expect(prisma.service.deleteMany).not.toHaveBeenCalled();
  });

  it('is a no-op for an account already within its limit (idempotent re-run)', async () => {
    prisma.professional.findMany.mockResolvedValue([{ id: 'prof-1' }]);
    prisma.service.findMany.mockResolvedValue([
      { id: 's0', planLocked: false, planEnabledAt: new Date() },
      { id: 's1', planLocked: false, planEnabledAt: new Date() },
      { id: 's2', planLocked: false, planEnabledAt: new Date() },
      { id: 's3', planLocked: true, planEnabledAt: new Date() },
    ]);
    await scheduler.sweep(NOW);
    expect(prisma.service.updateMany).not.toHaveBeenCalled();
    expect(prisma.service.update).not.toHaveBeenCalled();
  });

  it('keeps going when one account fails', async () => {
    prisma.professional.findMany.mockResolvedValue([
      { id: 'broken' },
      { id: 'prof-2' },
    ]);
    prisma.professional.findUniqueOrThrow
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        plan: 'FREE',
        trialStartedAt: null,
        trialEndsAt: null,
      });
    await expect(scheduler.sweep(NOW)).resolves.toBeUndefined();
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('does nothing when DISABLE_SCHEDULED_JOBS is set', async () => {
    process.env.DISABLE_SCHEDULED_JOBS = 'true';
    await scheduler.handleTrialExpiry();
    expect(prisma.professional.findMany).not.toHaveBeenCalled();
  });
});
