import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Service as ServiceModel } from '@prisma/client';
import {
  PLAN_SERVICE_LIMITS,
  type CreateServiceInput,
  type Service,
  type UpdateServiceInput,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { UsageAlertsService } from '../notifications/usage-alerts.service';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageAlerts: UsageAlertsService,
  ) {}

  toDto(service: ServiceModel): Service {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      isActive: service.isActive,
      homeServiceEnabled: service.homeServiceEnabled,
      homeDurationMinutes: service.homeDurationMinutes,
      homePriceCents: service.homePriceCents,
      sortOrder: service.sortOrder,
      planLocked: service.planLocked,
      planEnabledAt: service.planEnabledAt?.toISOString() ?? null,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  async findAllForProfessional(professionalId: string): Promise<Service[]> {
    const services = await this.prisma.service.findMany({
      where: { professionalId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });

    return services.map((service) => this.toDto(service));
  }

  async create(
    professionalId: string,
    input: CreateServiceInput,
  ): Promise<Service> {
    const plan = await this.assertWithinPlanLimit(professionalId);

    const sortOrder = await this.prisma.service.count({
      where: { professionalId, deletedAt: null },
    });

    const service = await this.prisma.service.create({
      data: {
        professionalId,
        name: input.name,
        description: input.description ?? null,
        durationMinutes: input.durationMinutes,
        priceCents: input.priceCents,
        isActive: input.isActive ?? true,
        homeServiceEnabled: input.homeServiceEnabled ?? false,
        homeDurationMinutes: input.homeServiceEnabled
          ? (input.homeDurationMinutes ?? null)
          : null,
        homePriceCents: input.homeServiceEnabled
          ? (input.homePriceCents ?? null)
          : null,
        sortOrder,
        planEnabledAt: new Date(),
      },
    });

    await this.usageAlerts.checkServiceLimits(
      professionalId,
      sortOrder + 1,
      plan,
    );

    return this.toDto(service);
  }

  async update(
    professionalId: string,
    serviceId: string,
    input: UpdateServiceInput,
  ): Promise<Service> {
    await this.findOwnedOrThrow(professionalId, serviceId);

    const homeServiceOff = input.homeServiceEnabled === false;

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.durationMinutes !== undefined
          ? { durationMinutes: input.durationMinutes }
          : {}),
        ...(input.priceCents !== undefined
          ? { priceCents: input.priceCents }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.homeServiceEnabled !== undefined
          ? { homeServiceEnabled: input.homeServiceEnabled }
          : {}),
        ...(input.homeDurationMinutes !== undefined || homeServiceOff
          ? {
              homeDurationMinutes: homeServiceOff
                ? null
                : (input.homeDurationMinutes ?? null),
            }
          : {}),
        ...(input.homePriceCents !== undefined || homeServiceOff
          ? {
              homePriceCents: homeServiceOff
                ? null
                : (input.homePriceCents ?? null),
            }
          : {}),
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
      data: { deletedAt: new Date(), isActive: false },
    });

    return this.toDto(service);
  }

  async duplicate(professionalId: string, serviceId: string): Promise<Service> {
    const source = await this.findOwnedOrThrow(professionalId, serviceId);
    const plan = await this.assertWithinPlanLimit(professionalId);

    const sortOrder = await this.prisma.service.count({
      where: { professionalId, deletedAt: null },
    });

    const service = await this.prisma.service.create({
      data: {
        professionalId,
        name: `${source.name} (copia)`,
        description: source.description,
        durationMinutes: source.durationMinutes,
        priceCents: source.priceCents,
        isActive: source.isActive,
        homeServiceEnabled: source.homeServiceEnabled,
        homeDurationMinutes: source.homeDurationMinutes,
        homePriceCents: source.homePriceCents,
        sortOrder,
        planEnabledAt: new Date(),
      },
    });

    await this.usageAlerts.checkServiceLimits(
      professionalId,
      sortOrder + 1,
      plan,
    );

    return this.toDto(service);
  }

  /**
   * Enables a service locked by the plan. With a free slot it is just
   * enabled; at the limit, the enabled service with the oldest
   * `planEnabledAt` is locked in exchange (FIFO). Returns every service whose
   * state changed.
   */
  async enableService(
    professionalId: string,
    serviceId: string,
  ): Promise<Service[]> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.service.findFirst({
        where: { id: serviceId, professionalId, deletedAt: null },
      });
      if (!target) {
        throw new NotFoundException('Servicio no encontrado.');
      }
      if (!target.planLocked) {
        return [this.toDto(target)];
      }

      const { plan } = await tx.professional.findUniqueOrThrow({
        where: { id: professionalId },
        select: { plan: true },
      });
      const limit = PLAN_SERVICE_LIMITS[plan];
      const changed: Service[] = [];

      if (limit !== null) {
        const enabledCount = await tx.service.count({
          where: { professionalId, deletedAt: null, planLocked: false },
        });
        if (enabledCount >= limit) {
          const oldest = await tx.service.findFirst({
            where: { professionalId, deletedAt: null, planLocked: false },
            orderBy: [
              { planEnabledAt: { sort: 'asc', nulls: 'first' } },
              { sortOrder: 'asc' },
            ],
          });
          if (oldest) {
            changed.push(
              this.toDto(
                await tx.service.update({
                  where: { id: oldest.id },
                  data: { planLocked: true },
                }),
              ),
            );
          }
        }
      }

      const enabled = await tx.service.update({
        where: { id: serviceId },
        data: { planLocked: false, planEnabledAt: new Date() },
      });
      return [this.toDto(enabled), ...changed];
    });
  }

  private async assertWithinPlanLimit(professionalId: string) {
    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: { plan: true },
    });
    const limit = PLAN_SERVICE_LIMITS[professional.plan];
    if (limit === null) return professional.plan;

    const count = await this.prisma.service.count({
      where: { professionalId, deletedAt: null },
    });
    if (count >= limit) {
      throw new ForbiddenException(
        'Alcanzaste el límite de servicios de tu plan.',
      );
    }
    return professional.plan;
  }

  private async findOwnedOrThrow(
    professionalId: string,
    serviceId: string,
  ): Promise<ServiceModel> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, professionalId, deletedAt: null },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado.');
    }
    return service;
  }
}
