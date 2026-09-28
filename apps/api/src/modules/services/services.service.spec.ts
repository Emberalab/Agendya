import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { UsageAlertsService } from '../notifications/usage-alerts.service';
import { ServicesService } from './services.service';

const BASE_SERVICE = {
  id: 'service-1',
  professionalId: 'prof-1',
  name: 'Corte de cabello',
  description: null,
  durationMinutes: 30,
  priceCents: 2000000,
  isActive: true,
  homeServiceEnabled: false,
  homeDurationMinutes: null,
  homePriceCents: null,
  sortOrder: 0,
  planLocked: false,
  planEnabledAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: {
    service: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    professional: {
      findUniqueOrThrow: jest.Mock;
    };
  };
  let usageAlerts: { checkServiceLimits: jest.Mock };

  beforeEach(async () => {
    prisma = {
      service: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      professional: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ plan: 'FREE' }),
      },
    };

    usageAlerts = {
      checkServiceLimits: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsageAlertsService, useValue: usageAlerts },
      ],
    }).compile();

    service = moduleRef.get(ServicesService);
  });

  describe('toDto', () => {
    it('serializes dates to ISO strings and exposes pricing fields', () => {
      expect(service.toDto(BASE_SERVICE)).toEqual({
        id: 'service-1',
        name: 'Corte de cabello',
        description: null,
        durationMinutes: 30,
        priceCents: 2000000,
        isActive: true,
        homeServiceEnabled: false,
        homeDurationMinutes: null,
        homePriceCents: null,
        sortOrder: 0,
        planLocked: false,
        planEnabledAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
    });
  });

  describe('findAllForProfessional', () => {
    it('lists non-deleted services ordered by sortOrder', async () => {
      prisma.service.findMany.mockResolvedValue([BASE_SERVICE]);

      const result = await service.findAllForProfessional('prof-1');

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1', deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('service-1');
    });
  });

  describe('create', () => {
    it('appends the new service at the end of the sort order', async () => {
      prisma.service.count.mockResolvedValue(2);
      prisma.service.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...BASE_SERVICE, ...data, id: 'service-2' }),
      );

      const result = await service.create('prof-1', {
        name: 'Manicure',
        durationMinutes: 45,
        priceCents: 1500000,
        isActive: true,
        homeServiceEnabled: false,
      });

      type CreateCall = [{ data: Record<string, unknown> }];
      const [[createArgs]] = prisma.service.create.mock.calls as CreateCall[];
      expect(createArgs.data).toMatchObject({
        professionalId: 'prof-1',
        name: 'Manicure',
        durationMinutes: 45,
        priceCents: 1500000,
        sortOrder: 2,
      });
      expect(createArgs.data.planEnabledAt).toBeInstanceOf(Date);
      expect(result.sortOrder).toBe(2);
      expect(usageAlerts.checkServiceLimits).toHaveBeenCalledWith(
        'prof-1',
        3,
        'FREE',
      );
    });

    it('rejects creating a service past the plan limit', async () => {
      prisma.professional.findUniqueOrThrow.mockResolvedValue({
        plan: 'FREE',
      });
      prisma.service.count.mockResolvedValue(3);

      await expect(
        service.create('prof-1', {
          name: 'Cuarto servicio',
          durationMinutes: 30,
          priceCents: 1000000,
          isActive: true,
          homeServiceEnabled: false,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.service.create).not.toHaveBeenCalled();
    });

    it('allows unlimited services on the ADVANCED plan', async () => {
      prisma.professional.findUniqueOrThrow.mockResolvedValue({
        plan: 'ADVANCED',
      });
      prisma.service.count.mockResolvedValue(50);
      prisma.service.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...BASE_SERVICE, ...data, id: 'service-51' }),
      );

      await expect(
        service.create('prof-1', {
          name: 'Servicio 51',
          durationMinutes: 30,
          priceCents: 1000000,
          isActive: true,
          homeServiceEnabled: false,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('rejects updating a service that does not belong to the professional', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.update('prof-1', 'someone-elses-service', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.service.update).not.toHaveBeenCalled();
    });

    it('updates only the provided fields for an owned service', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.service.update.mockResolvedValue({
        ...BASE_SERVICE,
        durationMinutes: 60,
      });

      await service.update('prof-1', 'service-1', { durationMinutes: 60 });

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { durationMinutes: 60 },
      });
    });

    it('clears home-service fields when the toggle is turned off', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...BASE_SERVICE,
        homeServiceEnabled: true,
        homeDurationMinutes: 90,
        homePriceCents: 5000000,
      });
      prisma.service.update.mockResolvedValue(BASE_SERVICE);

      await service.update('prof-1', 'service-1', {
        homeServiceEnabled: false,
      });

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          homeServiceEnabled: false,
          homeDurationMinutes: null,
          homePriceCents: null,
        },
      });
    });
  });

  describe('softDelete', () => {
    it('rejects deleting a service that does not belong to the professional', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.softDelete('prof-1', 'someone-elses-service'),
      ).rejects.toThrow(NotFoundException);
    });

    it('stamps deletedAt instead of removing the row', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.service.update.mockResolvedValue({
        ...BASE_SERVICE,
        deletedAt: new Date(),
        isActive: false,
      });

      await service.softDelete('prof-1', 'service-1');

      type UpdateCall = [
        {
          where: { id: string };
          data: { deletedAt: unknown; isActive: boolean };
        },
      ];
      const [[updateArgs]] = prisma.service.update.mock.calls as UpdateCall[];
      expect(updateArgs.where).toEqual({ id: 'service-1' });
      expect(updateArgs.data.isActive).toBe(false);
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('duplicate', () => {
    it('copies an owned service with a "(copia)" suffix', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.service.count.mockResolvedValue(1);
      prisma.service.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...BASE_SERVICE, ...data, id: 'service-2' }),
      );

      const result = await service.duplicate('prof-1', 'service-1');

      type CreateCall = [{ data: Record<string, unknown> }];
      const [[createArgs]] = prisma.service.create.mock.calls as CreateCall[];
      expect(createArgs.data).toMatchObject({
        professionalId: 'prof-1',
        name: 'Corte de cabello (copia)',
        durationMinutes: 30,
        priceCents: 2000000,
        sortOrder: 1,
      });
      expect(result.name).toBe('Corte de cabello (copia)');
    });

    it('rejects duplicating past the plan limit', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.professional.findUniqueOrThrow.mockResolvedValue({
        plan: 'FREE',
      });
      prisma.service.count.mockResolvedValue(3);

      await expect(service.duplicate('prof-1', 'service-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.service.create).not.toHaveBeenCalled();
    });
  });

  describe('enableService', () => {
    let tx: {
      service: { findFirst: jest.Mock; count: jest.Mock; update: jest.Mock };
      professional: { findUniqueOrThrow: jest.Mock };
    };

    beforeEach(() => {
      tx = {
        service: {
          findFirst: jest.fn(),
          count: jest.fn(),
          update: jest
            .fn()
            .mockImplementation(
              ({
                where,
                data,
              }: {
                where: { id: string };
                data: Record<string, unknown>;
              }) => Promise.resolve({ ...BASE_SERVICE, id: where.id, ...data }),
            ),
        },
        professional: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ plan: 'FREE' }),
        },
      };
      (prisma as unknown as { $transaction: jest.Mock }).$transaction = jest
        .fn()
        .mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));
    });

    it('swaps out the oldest enabled service at the plan limit and returns both', async () => {
      tx.service.findFirst
        .mockResolvedValueOnce({
          ...BASE_SERVICE,
          id: 'svc-4',
          planLocked: true,
        })
        .mockResolvedValueOnce({ ...BASE_SERVICE, id: 'svc-1' });
      tx.service.count.mockResolvedValue(3);

      const result = await service.enableService('prof-1', 'svc-4');

      expect(tx.service.update).toHaveBeenCalledWith({
        where: { id: 'svc-1' },
        data: { planLocked: true },
      });
      expect(result.map((s) => [s.id, s.planLocked])).toEqual([
        ['svc-4', false],
        ['svc-1', true],
      ]);
    });

    it('just enables when there is a free slot', async () => {
      tx.service.findFirst.mockResolvedValueOnce({
        ...BASE_SERVICE,
        id: 'svc-4',
        planLocked: true,
      });
      tx.service.count.mockResolvedValue(2);

      const result = await service.enableService('prof-1', 'svc-4');

      expect(tx.service.update).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });
});
