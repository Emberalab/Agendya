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
  category: null,
  photoUrl: null,
  logoUrl: null,
  coverImageUrl: null,
  brandColor: '#4F46E5',
  description: null,
  timezone: 'America/Bogota',
  cancellationPolicyHours: 24,
  plan: 'FREE' as const,
  googleId: null,
  role: 'INDEPENDENT' as const,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;
  let prisma: {
    professional: {
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    booking: { count: jest.Mock };
    service: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue(BASE_PROFESSIONAL),
        update: jest.fn(),
      },
      booking: { count: jest.fn().mockResolvedValue(0) },
      service: { count: jest.fn().mockResolvedValue(0) },
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
      const profile = service.toProfile(BASE_PROFESSIONAL, 12);

      expect(profile).toEqual({
        id: 'prof-1',
        email: 'maria@example.com',
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        category: null,
        photoUrl: null,
        logoUrl: null,
        coverImageUrl: null,
        brandColor: '#4F46E5',
        description: null,
        timezone: 'America/Bogota',
        cancellationPolicyHours: 24,
        plan: 'FREE',
        bookingsThisMonth: 12,
        serviceCount: 0,
        monthlyBookingLimit: 100,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('reports an unlimited monthly allowance from Básico upward', () => {
      const profile = service.toProfile(
        { ...BASE_PROFESSIONAL, plan: 'BASIC' },
        999,
      );
      expect(profile.monthlyBookingLimit).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('loads the professional and this month’s booking count', async () => {
      prisma.booking.count.mockResolvedValue(7);
      prisma.service.count.mockResolvedValue(3);

      const profile = await service.getProfile('prof-1');

      expect(prisma.professional.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
      });
      type CountCall = [
        { where: { createdAt: { gte: Date }; [key: string]: unknown } },
      ];
      const [[countArgs]] = prisma.booking.count.mock.calls as CountCall[];
      expect(countArgs.where).toMatchObject({
        professionalId: 'prof-1',
        status: { not: 'CANCELLED' },
      });
      expect(countArgs.where.createdAt.gte).toBeInstanceOf(Date);
      expect(prisma.service.count).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1', deletedAt: null },
      });
      expect(profile.bookingsThisMonth).toBe(7);
      expect(profile.serviceCount).toBe(3);
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

    it('persists the cover image and brand colour', async () => {
      prisma.professional.update.mockResolvedValue(BASE_PROFESSIONAL);

      await service.updateProfile('prof-1', {
        coverImageUrl: 'https://cdn.test/cover.jpg',
        brandColor: '#0EA5E9',
      });

      expect(prisma.professional.update).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
        data: {
          coverImageUrl: 'https://cdn.test/cover.jpg',
          brandColor: '#0EA5E9',
        },
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
          {
            id: 'service-1',
            name: 'Corte de cabello',
            description: 'Clásico',
            durationMinutes: 30,
            priceCents: 3000000,
            homeServiceEnabled: true,
            homeDurationMinutes: 45,
            homePriceCents: 5000000,
          },
        ],
      });

      const result = await service.findPublicBySlug('maria-belleza');

      expect(prisma.professional.findFirst).toHaveBeenCalledWith({
        where: { slug: 'maria-belleza', isActive: true },
        include: {
          services: {
            where: { isActive: true, deletedAt: null },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      expect(result).toEqual({
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        category: null,
        photoUrl: null,
        logoUrl: null,
        coverImageUrl: null,
        brandColor: '#4F46E5',
        description: null,
        services: [
          {
            id: 'service-1',
            name: 'Corte de cabello',
            description: 'Clásico',
            durationMinutes: 30,
            priceCents: 3000000,
            homeServiceEnabled: true,
            homeDurationMinutes: 45,
            homePriceCents: 5000000,
          },
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
