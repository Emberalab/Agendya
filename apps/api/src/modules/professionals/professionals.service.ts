import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  PLAN_MONTHLY_BOOKING_LIMITS,
  type ProfessionalProfile,
  type PublicProfessional,
  type UpdateProfileInput,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  toProfile(
    professional: Professional,
    bookingsThisMonth = 0,
    serviceCount = 0,
  ): ProfessionalProfile {
    return {
      id: professional.id,
      email: professional.email,
      businessName: professional.businessName,
      slug: professional.slug,
      category: professional.category,
      photoUrl: professional.photoUrl,
      logoUrl: professional.logoUrl,
      coverImageUrl: professional.coverImageUrl,
      brandColor: professional.brandColor,
      description: professional.description,
      timezone: professional.timezone,
      cancellationPolicyHours: professional.cancellationPolicyHours,
      plan: professional.plan,
      bookingsThisMonth,
      serviceCount,
      monthlyBookingLimit: PLAN_MONTHLY_BOOKING_LIMITS[professional.plan],
      createdAt: professional.createdAt.toISOString(),
      updatedAt: professional.updatedAt.toISOString(),
    };
  }

  /** Non-cancelled bookings created since the first day of the current month. */
  async countBookingsThisMonth(professionalId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    return this.prisma.booking.count({
      where: {
        professionalId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: monthStart },
      },
    });
  }

  async countServices(professionalId: string): Promise<number> {
    return this.prisma.service.count({
      where: { professionalId, deletedAt: null },
    });
  }

  async getProfile(professionalId: string): Promise<ProfessionalProfile> {
    const [professional, bookingsThisMonth, serviceCount] = await Promise.all([
      this.prisma.professional.findUniqueOrThrow({
        where: { id: professionalId },
      }),
      this.countBookingsThisMonth(professionalId),
      this.countServices(professionalId),
    ]);
    return this.toProfile(professional, bookingsThisMonth, serviceCount);
  }

  async updateProfile(
    professionalId: string,
    input: UpdateProfileInput,
  ): Promise<ProfessionalProfile> {
    if (input.slug) {
      const available = await this.isSlugAvailable(input.slug, professionalId);
      if (!available) {
        throw new ConflictException('Ese enlace ya está en uso.');
      }
    }

    const professional = await this.prisma.professional.update({
      where: { id: professionalId },
      data: {
        ...(input.businessName !== undefined
          ? { businessName: input.businessName }
          : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.coverImageUrl !== undefined
          ? { coverImageUrl: input.coverImageUrl }
          : {}),
        ...(input.brandColor !== undefined
          ? { brandColor: input.brandColor }
          : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.cancellationPolicyHours !== undefined
          ? { cancellationPolicyHours: input.cancellationPolicyHours }
          : {}),
      },
    });

    const [bookingsThisMonth, serviceCount] = await Promise.all([
      this.countBookingsThisMonth(professionalId),
      this.countServices(professionalId),
    ]);
    return this.toProfile(professional, bookingsThisMonth, serviceCount);
  }

  async isSlugAvailable(
    slug: string,
    excludeProfessionalId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.professional.findFirst({
      where: {
        slug,
        ...(excludeProfessionalId
          ? { id: { not: excludeProfessionalId } }
          : {}),
      },
    });

    return !existing;
  }

  async findPublicBySlug(slug: string): Promise<PublicProfessional> {
    const professional = await this.prisma.professional.findFirst({
      where: { slug, isActive: true },
      include: {
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    return {
      businessName: professional.businessName,
      slug: professional.slug,
      category: professional.category,
      photoUrl: professional.photoUrl,
      logoUrl: professional.logoUrl,
      coverImageUrl: professional.coverImageUrl,
      brandColor: professional.brandColor,
      description: professional.description,
      services: professional.services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        homeServiceEnabled: service.homeServiceEnabled,
        homeDurationMinutes: service.homeDurationMinutes,
        homePriceCents: service.homePriceCents,
      })),
    };
  }
}
