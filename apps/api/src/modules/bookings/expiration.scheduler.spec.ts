import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { ExpirationScheduler } from './expiration.scheduler';

describe('ExpirationScheduler', () => {
  let scheduler: ExpirationScheduler;
  let prisma: { booking: { updateMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      booking: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExpirationScheduler,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    scheduler = moduleRef.get(ExpirationScheduler);

    // Fakes both `Date.now()` and `new Date()` — the scheduler builds its
    // cutoff with the latter.
    jest.useFakeTimers({ now: new Date('2026-08-01T14:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.DISABLE_SCHEDULED_JOBS;
  });

  it('flips CONFIRMED bookings whose start time has passed to EXPIRED', async () => {
    await scheduler.expireStaleBookings();

    expect(prisma.booking.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'CONFIRMED',
        startAt: { lt: new Date('2026-08-01T14:00:00.000Z') },
      },
      data: { status: 'EXPIRED' },
    });
  });

  it('does nothing when DISABLE_SCHEDULED_JOBS is set (test-suite guard)', async () => {
    process.env.DISABLE_SCHEDULED_JOBS = 'true';

    await scheduler.expireStaleBookings();

    expect(prisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('swallows a database error instead of throwing (best-effort background sweep)', async () => {
    prisma.booking.updateMany.mockRejectedValue(new Error('connection lost'));

    await expect(scheduler.expireStaleBookings()).resolves.toBeUndefined();
  });
});
