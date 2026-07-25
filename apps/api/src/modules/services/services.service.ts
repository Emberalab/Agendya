import { Injectable, NotFoundException } from '@nestjs/common';
import type { Service as ServiceModel } from '@prisma/client';
import type {
  CreateServiceInput,
  Service,
  UpdateServiceInput,
} from '@ronda/types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  toDto(service: ServiceModel): Service {
    return {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
      sortOrder: service.sortOrder,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  async findAllForProfessional(professionalId: string): Promise<Service[]> {
    const services = await this.prisma.service.findMany({
      where: { professionalId },
      orderBy: { sortOrder: 'asc' },
    });

    return services.map((service) => this.toDto(service));
  }

  async create(
    professionalId: string,
    input: CreateServiceInput,
  ): Promise<Service> {
    const sortOrder = await this.prisma.service.count({
      where: { professionalId },
    });

    const service = await this.prisma.service.create({
      data: {
        professionalId,
        name: input.name,
        durationMinutes: input.durationMinutes,
        sortOrder,
      },
    });

    return this.toDto(service);
  }

  async update(
    professionalId: string,
    serviceId: string,
    input: UpdateServiceInput,
  ): Promise<Service> {
    await this.findOwnedOrThrow(professionalId, serviceId);

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.durationMinutes !== undefined
          ? { durationMinutes: input.durationMinutes }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return this.toDto(service);
  }

  async softDelete(
    professionalId: string,
    serviceId: string,
  ): Promise<Service> {
    await this.findOwnedOrThrow(professionalId, serviceId);

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });

    return this.toDto(service);
  }

  private async findOwnedOrThrow(
    professionalId: string,
    serviceId: string,
  ): Promise<ServiceModel> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, professionalId },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado.');
    }
    return service;
  }
}
