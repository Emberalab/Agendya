import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import type {
  ProfessionalProfile,
  PublicProfessional,
  UpdateProfileInput,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  toProfile(professional: Professional): ProfessionalProfile {
    return {
      id: professional.id,
      email: professional.email,
      businessName: professional.businessName,
      slug: professional.slug,
      photoUrl: professional.photoUrl,
      logoUrl: professional.logoUrl,
      brandColor: professional.brandColor,
      description: professional.description,
      timezone: professional.timezone,
      cancellationPolicyHours: professional.cancellationPolicyHours,
      plan: professional.plan,
      createdAt: professional.createdAt.toISOString(),
      updatedAt: professional.updatedAt.toISOString(),
    };
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
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.brandColor !== undefined
          ? { brandColor: input.brandColor }
          : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.cancellationPolicyHours !== undefined
          ? { cancellationPolicyHours: input.cancellationPolicyHours }
          : {}),
      },
    });

    return this.toProfile(professional);
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
        services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    return {
      businessName: professional.businessName,
      slug: professional.slug,
      photoUrl: professional.photoUrl,
      logoUrl: professional.logoUrl,
      brandColor: professional.brandColor,
      description: professional.description,
      services: professional.services.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
      })),
    };
  }
}
