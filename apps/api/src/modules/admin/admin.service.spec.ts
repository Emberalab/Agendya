import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AdminService } from './admin.service';

const SUPER_ADMIN_ROW = {
  id: 'grant-1',
  email: 'admin@agendya.co',
  access: 'SUPER_ADMIN' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const OTHER_ADMIN_ROW = {
  id: 'grant-2',
  email: 'other@agendya.co',
  access: 'SUPER_ADMIN' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    platformAccessEmail: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    professional: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      platformAccessEmail: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      professional: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  describe('updateAllowlistEntry', () => {
    it('rejects downgrading your own grant', async () => {
      prisma.platformAccessEmail.findUnique.mockResolvedValue(SUPER_ADMIN_ROW);

      await expect(
        service.updateAllowlistEntry(
          'admin@agendya.co',
          { access: 'ALLOWLISTED' },
          'admin@agendya.co',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.platformAccessEmail.update).not.toHaveBeenCalled();
    });

    it('rejects downgrading the last SUPER_ADMIN grant', async () => {
      prisma.platformAccessEmail.findUnique.mockResolvedValue(OTHER_ADMIN_ROW);
      prisma.platformAccessEmail.count.mockResolvedValue(1);

      await expect(
        service.updateAllowlistEntry(
          'other@agendya.co',
          { access: 'ALLOWLISTED' },
          'admin@agendya.co',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.platformAccessEmail.update).not.toHaveBeenCalled();
    });

    it('downgrades another SUPER_ADMIN when at least one remains', async () => {
      prisma.platformAccessEmail.findUnique.mockResolvedValue(OTHER_ADMIN_ROW);
      prisma.platformAccessEmail.count.mockResolvedValue(2);
      prisma.platformAccessEmail.update.mockResolvedValue({
        ...OTHER_ADMIN_ROW,
        access: 'ALLOWLISTED',
      });

      const result = await service.updateAllowlistEntry(
        'other@agendya.co',
        { access: 'ALLOWLISTED' },
        'admin@agendya.co',
      );

      expect(result.access).toBe('ALLOWLISTED');
    });
  });

  describe('deleteAllowlistEntry', () => {
    it('rejects deleting your own grant', async () => {
      prisma.platformAccessEmail.findUnique.mockResolvedValue(SUPER_ADMIN_ROW);

      await expect(
        service.deleteAllowlistEntry('admin@agendya.co', 'admin@agendya.co'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.platformAccessEmail.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting the last SUPER_ADMIN grant', async () => {
      prisma.platformAccessEmail.findUnique.mockResolvedValue(OTHER_ADMIN_ROW);
      prisma.platformAccessEmail.count.mockResolvedValue(1);

      await expect(
        service.deleteAllowlistEntry('other@agendya.co', 'admin@agendya.co'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.platformAccessEmail.delete).not.toHaveBeenCalled();
    });
  });

  describe('getProfessionalByEmail', () => {
    it('throws not found when the email is unknown', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);

      await expect(
        service.getProfessionalByEmail('missing@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
