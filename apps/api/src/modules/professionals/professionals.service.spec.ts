import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { ProfessionalsService } from './professionals.service';

const BASE_PROFESSIONAL = {
  id: 'prof-1',
  email: 'maria@example.com',
  passwordHash: 'hash',
  businessName: 'María Belleza',
  slug: 'maria-belleza',
  photoUrl: null,
  description: null,
  timezone: 'America/Bogota',
  cancellationPolicyHours: 24,
  plan: 'BASIC',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;
  let prisma: {
    professional: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfessionalsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ProfessionalsService);
  });

  describe('toProfile', () => {
    it('serializes dates to ISO strings and drops the password hash', () => {
      const profile = service.toProfile(BASE_PROFESSIONAL);

      expect(profile).toEqual({
        id: 'prof-1',
        email: 'maria@example.com',
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        photoUrl: null,
        description: null,
        timezone: 'America/Bogota',
        cancellationPolicyHours: 24,
        plan: 'BASIC',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
      expect(profile).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateProfile', () => {
    it('updates only the provided fields', async () => {
      prisma.professional.update.mockResolvedValue({
        ...BASE_PROFESSIONAL,
        businessName: 'Nuevo Nombre',
      });

      await service.updateProfile('prof-1', { businessName: 'Nuevo Nombre' });

      expect(prisma.professional.update).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
        data: { businessName: 'Nuevo Nombre' },
      });
    });

    it('rejects the update when the requested slug is already taken by someone else', async () => {
      prisma.professional.findFirst.mockResolvedValue({
        id: 'other-professional',
      });

      await expect(
        service.updateProfile('prof-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.professional.update).not.toHaveBeenCalled();
    });

    it('allows the update when the slug is free', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.professional.update.mockResolvedValue({
        ...BASE_PROFESSIONAL,
        slug: 'nuevo-slug',
      });

      await service.updateProfile('prof-1', { slug: 'nuevo-slug' });

      expect(prisma.professional.findFirst).toHaveBeenCalledWith({
        where: { slug: 'nuevo-slug', id: { not: 'prof-1' } },
      });
      expect(prisma.professional.update).toHaveBeenCalled();
    });
  });

  describe('findPublicBySlug', () => {
    it('returns the public profile fields and active services for an active professional', async () => {
      prisma.professional.findFirst.mockResolvedValue({
        ...BASE_PROFESSIONAL,
        services: [
          { id: 'service-1', name: 'Corte de cabello', durationMinutes: 30 },
        ],
      });

      const result = await service.findPublicBySlug('maria-belleza');

      expect(prisma.professional.findFirst).toHaveBeenCalledWith({
        where: { slug: 'maria-belleza', isActive: true },
        include: {
          services: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      expect(result).toEqual({
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        photoUrl: null,
        description: null,
        services: [
          { id: 'service-1', name: 'Corte de cabello', durationMinutes: 30 },
        ],
      });
    });

    it('throws not found when no active professional matches the slug', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);

      await expect(service.findPublicBySlug('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
