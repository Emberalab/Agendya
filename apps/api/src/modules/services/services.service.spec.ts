import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { ServicesService } from './services.service';

const BASE_SERVICE = {
  id: 'service-1',
  professionalId: 'prof-1',
  name: 'Corte de cabello',
  durationMinutes: 30,
  isActive: true,
  sortOrder: 0,
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
  };

  beforeEach(async () => {
    prisma = {
      service: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ServicesService);
  });

  describe('toDto', () => {
    it('serializes dates to ISO strings', () => {
      expect(service.toDto(BASE_SERVICE)).toEqual({
        id: 'service-1',
        name: 'Corte de cabello',
        durationMinutes: 30,
        isActive: true,
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
    });
  });

  describe('findAllForProfessional', () => {
    it('lists services ordered by sortOrder', async () => {
      prisma.service.findMany.mockResolvedValue([BASE_SERVICE]);

      const result = await service.findAllForProfessional('prof-1');

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1' },
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
      });

      expect(prisma.service.create).toHaveBeenCalledWith({
        data: {
          professionalId: 'prof-1',
          name: 'Manicure',
          durationMinutes: 45,
          sortOrder: 2,
        },
      });
      expect(result.sortOrder).toBe(2);
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
  });

  describe('softDelete', () => {
    it('rejects deleting a service that does not belong to the professional', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(
        service.softDelete('prof-1', 'someone-elses-service'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deactivates an owned service instead of removing the row', async () => {
      prisma.service.findFirst.mockResolvedValue(BASE_SERVICE);
      prisma.service.update.mockResolvedValue({
        ...BASE_SERVICE,
        isActive: false,
      });

      const result = await service.softDelete('prof-1', 'service-1');

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });
  });
});
