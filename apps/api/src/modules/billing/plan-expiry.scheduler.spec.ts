import { Test } from '@nestjs/testing';
import { BILLING_GRACE_DAYS } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { PlanExpiryScheduler } from './plan-expiry.scheduler';

const DOWNGRADE_DATA = {
  plan: 'FREE',
  billingInterval: null,
  planStartedAt: null,
  planExpiresAt: null,
  planCancelledAt: null,
};

describe('PlanExpiryScheduler', () => {
  let scheduler: PlanExpiryScheduler;
  let prisma: {
    professional: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    service: {
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mailService: { sendPlanUpdated: jest.Mock };

  const downgradeCall = () => {
    const calls = prisma.professional.updateMany.mock.calls as [
      Record<string, unknown>,
    ][];
    return calls[0]?.[0];
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        // Row as re-read after the downgrade: FREE, no trial.
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          plan: 'FREE',
          trialStartedAt: null,
          trialEndsAt: null,
        }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };

    mailService = {
      sendPlanUpdated: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanExpiryScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    scheduler = moduleRef.get(PlanExpiryScheduler);

    jest.useFakeTimers({ now: new Date('2026-08-04T14:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.DISABLE_SCHEDULED_JOBS;
  });

  it('downgrades ACTIVE plan after 3-day grace period and locks excess services', async () => {
    const gracePeriodMs = BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const now = new Date('2026-08-04T14:00:00.000Z');
    const expiredBeforeGrace = new Date(now.getTime() - gracePeriodMs - 1000);

    prisma.professional.findMany.mockResolvedValue([
      {
        id: 'prof-1',
        email: 'test@example.com',
        businessName: 'Test Business',
        plan: 'BASIC',
        planExpiresAt: expiredBeforeGrace,
        planCancelledAt: null,
      },
    ]);

    prisma.service.findMany.mockResolvedValue([
      { id: 'svc-1', planLocked: false, planEnabledAt: new Date() },
      { id: 'svc-2', planLocked: false, planEnabledAt: new Date() },
      { id: 'svc-3', planLocked: false, planEnabledAt: new Date() },
      { id: 'svc-4', planLocked: false, planEnabledAt: new Date() },
    ]);

    await scheduler.handlePlanExpiry();

    expect(downgradeCall()).toMatchObject({
      where: { id: 'prof-1' },
      data: DOWNGRADE_DATA,
    });
    expect(prisma.service.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['svc-4'] } },
      data: { planLocked: true },
    });
    expect(mailService.sendPlanUpdated).toHaveBeenCalledWith(
      'test@example.com',
      'Test Business',
      'BASIC',
      'FREE',
      'expired',
    );
  });

  it('keeps services unlocked when a full-access trial is still active', async () => {
    const now = new Date('2026-08-04T14:00:00.000Z');
    prisma.professional.findMany.mockResolvedValue([
      {
        id: 'prof-1',
        email: 'test@example.com',
        businessName: 'Test Business',
        plan: 'BASIC',
        planExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
        planCancelledAt: null,
      },
    ]);
    prisma.professional.findUniqueOrThrow.mockResolvedValue({
      plan: 'FREE',
      trialStartedAt: new Date(now.getTime() - 86_400_000),
      trialEndsAt: new Date(now.getTime() + 86_400_000),
    });
    prisma.service.findMany.mockResolvedValue([
      { id: 'svc-1', planLocked: false, planEnabledAt: new Date() },
      { id: 'svc-2', planLocked: false, planEnabledAt: new Date() },
      { id: 'svc-3', planLocked: false, planEnabledAt: new Date() },
      { id: 'svc-4', planLocked: false, planEnabledAt: new Date() },
    ]);

    await scheduler.handlePlanExpiry();

    // The billed plan is downgraded, but the trial keeps full access.
    expect(downgradeCall()).toMatchObject({ data: DOWNGRADE_DATA });
    expect(prisma.service.updateMany).not.toHaveBeenCalled();
  });

  it('downgrades CANCELLED plan immediately (no grace period)', async () => {
    const now = new Date('2026-08-04T14:00:00.000Z');
    const expiredJustNow = new Date(now.getTime() - 1000);

    prisma.professional.findMany.mockResolvedValue([
      {
        id: 'prof-2',
        email: 'cancelled@example.com',
        businessName: 'Cancelled Business',
        plan: 'ADVANCED',
        planExpiresAt: expiredJustNow,
        planCancelledAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    ]);

    await scheduler.handlePlanExpiry();

    expect(downgradeCall()).toMatchObject({
      where: { id: 'prof-2' },
      data: DOWNGRADE_DATA,
    });
    expect(mailService.sendPlanUpdated).toHaveBeenCalledWith(
      'cancelled@example.com',
      'Cancelled Business',
      'ADVANCED',
      'FREE',
      'expired',
    );
  });

  it('sends no email when a concurrent run already downgraded the account', async () => {
    prisma.professional.findMany.mockResolvedValue([
      {
        id: 'prof-6',
        email: 'race@example.com',
        businessName: 'Race',
        plan: 'BASIC',
        planExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
        planCancelledAt: null,
      },
    ]);
    prisma.professional.updateMany.mockResolvedValue({ count: 0 });

    await scheduler.handlePlanExpiry();

    expect(prisma.service.findMany).not.toHaveBeenCalled();
    expect(mailService.sendPlanUpdated).not.toHaveBeenCalled();
  });

  it('does NOT downgrade plan with future expiry', async () => {
    const now = new Date('2026-08-04T14:00:00.000Z');
    const futureExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    prisma.professional.findMany.mockResolvedValue([
      {
        id: 'prof-3',
        email: 'future@example.com',
        businessName: 'Future Business',
        plan: 'BASIC',
        planExpiresAt: futureExpiry,
        planCancelledAt: null,
      },
    ]);

    await scheduler.handlePlanExpiry();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mailService.sendPlanUpdated).not.toHaveBeenCalled();
  });

  it('does NOT downgrade ACTIVE plan still within grace period', async () => {
    const now = new Date('2026-08-04T14:00:00.000Z');
    const expiredYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    prisma.professional.findMany.mockResolvedValue([
      {
        id: 'prof-4',
        email: 'grace@example.com',
        businessName: 'Grace Business',
        plan: 'BASIC',
        planExpiresAt: expiredYesterday,
        planCancelledAt: null,
      },
    ]);

    await scheduler.handlePlanExpiry();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mailService.sendPlanUpdated).not.toHaveBeenCalled();
  });

  it('does nothing when DISABLE_SCHEDULED_JOBS is set', async () => {
    process.env.DISABLE_SCHEDULED_JOBS = 'true';

    await scheduler.handlePlanExpiry();

    expect(prisma.professional.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('swallows database errors (best-effort background job)', async () => {
    prisma.professional.findMany.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(scheduler.handlePlanExpiry()).resolves.toBeUndefined();
  });
});
