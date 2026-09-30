import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TRIAL_DURATION_DAYS } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { AdminService } from './admin.service';
import { TrialService } from './trial.service';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-01T15:00:00.000Z');
const ADMIN = { id: 'admin-1', email: 'admin@agendya.co' };

const TARGET = {
  id: 'prof-1',
  email: 'barber@example.com',
  plan: 'FREE' as const,
  accessStatus: 'APPROVED' as const,
  trialStartedAt: null as Date | null,
  trialEndsAt: null as Date | null,
};

describe('TrialService', () => {
  let service: TrialService;
  let prisma: {
    professional: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
    service: { findMany: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    trialEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let adminService: { getProfessionalByEmail: jest.Mock };

  const eventData = () =>
    (
      prisma.trialEvent.create.mock.calls as [
        { data: Record<string, unknown> },
      ][]
    )[0][0].data;
  const updateArgs = () =>
    (
      prisma.professional.updateMany.mock.calls as [
        { where: Record<string, unknown>; data: Record<string, unknown> },
      ][]
    )[0][0];

  beforeEach(async () => {
    prisma = {
      professional: {
        findUnique: jest.fn().mockResolvedValue({ ...TARGET }),
        // Re-read inside the transaction by enforceEffectiveServiceLimit.
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      trialEvent: { create: jest.fn() },
      $transaction: jest.fn((fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };
    adminService = {
      getProfessionalByEmail: jest.fn().mockResolvedValue({ id: 'prof-1' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrialService,
        { provide: PrismaService, useValue: prisma },
        { provide: AdminService, useValue: adminService },
      ],
    }).compile();
    service = moduleRef.get(TrialService);
  });

  describe('grantTrial', () => {
    beforeEach(() => {
      prisma.professional.findUniqueOrThrow.mockResolvedValue({
        plan: 'FREE',
        trialStartedAt: NOW,
        trialEndsAt: new Date(NOW.getTime() + TRIAL_DURATION_DAYS * DAY),
      });
    });

    it('starts a trial now and ends it TRIAL_DURATION_DAYS later', async () => {
      await service.grantTrial('Barber@Example.com ', ADMIN, {}, NOW);

      expect(prisma.professional.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'barber@example.com' } }),
      );
      const { where, data } = updateArgs();
      expect(where).toEqual({
        id: 'prof-1',
        trialStartedAt: null,
        trialEndsAt: null,
      });
      expect(data).toEqual({
        trialStartedAt: NOW,
        trialEndsAt: new Date('2026-10-01T15:00:00.000Z'),
      });
      expect(adminService.getProfessionalByEmail).toHaveBeenCalledWith(
        'barber@example.com',
      );
    });

    it('records who granted it and when, in the same transaction', async () => {
      await service.grantTrial(
        'barber@example.com',
        ADMIN,
        { note: 'Piloto barberías' },
        NOW,
      );
      expect(eventData()).toEqual({
        professionalId: 'prof-1',
        action: 'GRANTED',
        actorId: 'admin-1',
        actorEmail: 'admin@agendya.co',
        previousEndsAt: null,
        endsAt: new Date('2026-10-01T15:00:00.000Z'),
        note: 'Piloto barberías',
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('unlocks services a previous downgrade had locked', async () => {
      prisma.service.findMany.mockResolvedValue([
        { id: 's1', planLocked: false, planEnabledAt: NOW },
        { id: 's2', planLocked: true, planEnabledAt: NOW },
      ]);
      await service.grantTrial('barber@example.com', ADMIN, {}, NOW);
      const [[unlock]] = prisma.service.update.mock.calls as [
        { where: { id: string }; data: { planLocked: boolean } },
      ][];
      expect(unlock.where).toEqual({ id: 's2' });
      expect(unlock.data.planLocked).toBe(false);
    });

    it('rejects granting a trial to yourself', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        ...TARGET,
        id: ADMIN.id,
      });
      await expect(
        service.grantTrial('admin@agendya.co', ADMIN, {}, NOW),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.professional.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an unknown account', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);
      await expect(
        service.grantTrial('nobody@example.com', ADMIN, {}, NOW),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an account that is not approved yet', async () => {
      const original = process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      delete process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      try {
        prisma.professional.findUnique.mockResolvedValue({
          ...TARGET,
          accessStatus: 'DECLINED',
        });
        await expect(
          service.grantTrial('barber@example.com', ADMIN, {}, NOW),
        ).rejects.toThrow(BadRequestException);
      } finally {
        if (original !== undefined) {
          process.env.PROFESSIONAL_EMAIL_ALLOWLIST = original;
        }
      }
    });

    it('rejects a second grant while a trial is active', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        ...TARGET,
        trialStartedAt: new Date(NOW.getTime() - DAY),
        trialEndsAt: new Date(NOW.getTime() + DAY),
      });
      await expect(
        service.grantTrial(
          'barber@example.com',
          ADMIN,
          { allowRepeat: true },
          NOW,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.professional.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a repeat trial after one was used, unless explicitly overridden', async () => {
      const used = {
        ...TARGET,
        trialStartedAt: new Date(NOW.getTime() - 40 * DAY),
        trialEndsAt: new Date(NOW.getTime() - 10 * DAY),
      };
      prisma.professional.findUnique.mockResolvedValue(used);
      await expect(
        service.grantTrial('barber@example.com', ADMIN, {}, NOW),
      ).rejects.toThrow('ya usó su período de prueba');

      await service.grantTrial(
        'barber@example.com',
        ADMIN,
        { allowRepeat: true },
        NOW,
      );
      expect(updateArgs().where).toEqual({
        id: 'prof-1',
        trialStartedAt: used.trialStartedAt,
        trialEndsAt: used.trialEndsAt,
      });
      expect(eventData().previousEndsAt).toEqual(used.trialEndsAt);
    });

    it('rejects an account whose plan already has full access', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        ...TARGET,
        plan: 'BUSINESS',
      });
      await expect(
        service.grantTrial('barber@example.com', ADMIN, {}, NOW),
      ).rejects.toThrow(BadRequestException);
    });

    it('turns a concurrent double grant into a conflict and writes no audit row', async () => {
      prisma.professional.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.grantTrial('barber@example.com', ADMIN, {}, NOW),
      ).rejects.toThrow(ConflictException);
      expect(prisma.trialEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('extendTrial', () => {
    const endsAt = new Date(NOW.getTime() + 5 * DAY);

    it('adds days to the current end and audits the change', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        ...TARGET,
        trialStartedAt: new Date(NOW.getTime() - 25 * DAY),
        trialEndsAt: endsAt,
      });
      await service.extendTrial('barber@example.com', ADMIN, { days: 7 }, NOW);

      expect(updateArgs()).toEqual({
        where: { id: 'prof-1', trialEndsAt: endsAt },
        data: { trialEndsAt: new Date(endsAt.getTime() + 7 * DAY) },
      });
      expect(eventData()).toMatchObject({
        action: 'EXTENDED',
        actorEmail: 'admin@agendya.co',
        previousEndsAt: endsAt,
        endsAt: new Date(endsAt.getTime() + 7 * DAY),
      });
    });

    it('refuses to extend an expired trial (that is a repeat grant)', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        ...TARGET,
        trialStartedAt: new Date(NOW.getTime() - 40 * DAY),
        trialEndsAt: new Date(NOW.getTime() - 10 * DAY),
      });
      await expect(
        service.extendTrial('barber@example.com', ADMIN, { days: 7 }, NOW),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('endTrial', () => {
    it('ends the trial now and locks (never deletes) services over the FREE limit', async () => {
      const endsAt = new Date(NOW.getTime() + 5 * DAY);
      prisma.professional.findUnique.mockResolvedValue({
        ...TARGET,
        trialStartedAt: new Date(NOW.getTime() - 25 * DAY),
        trialEndsAt: endsAt,
      });
      prisma.professional.findUniqueOrThrow.mockResolvedValue({
        plan: 'FREE',
        trialStartedAt: new Date(NOW.getTime() - 25 * DAY),
        trialEndsAt: NOW,
      });
      prisma.service.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `s${i}`,
          planLocked: false,
          planEnabledAt: NOW,
        })),
      );

      await service.endTrial('barber@example.com', ADMIN, {}, NOW);

      expect(updateArgs()).toEqual({
        where: { id: 'prof-1', trialEndsAt: endsAt },
        data: { trialEndsAt: NOW },
      });
      expect(eventData()).toMatchObject({
        action: 'ENDED',
        previousEndsAt: endsAt,
        endsAt: NOW,
      });
      expect(prisma.service.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['s3', 's4'] } },
        data: { planLocked: true },
      });
    });

    it('rejects ending a trial that is not active', async () => {
      await expect(
        service.endTrial('barber@example.com', ADMIN, {}, NOW),
      ).rejects.toThrow(ConflictException);
    });
  });
});
