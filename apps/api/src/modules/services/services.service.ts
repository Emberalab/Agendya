import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Service as ServiceModel } from '@prisma/client';
import {
  PLAN_SERVICE_LIMITS,
  effectivePlan,
  type CreateServiceInput,
  type Service,
  type UpdateServiceInput,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { UsageAlertsService } from '../notifications/usage-alerts.service';
import { ActivityService, diffFields } from '../activity/activity.service';

/** Service fields whose before/after values are safe to show in the timeline. */
const TRACKED_SERVICE_FIELDS = [
  'name',
  'description',
  'durationMinutes',
  'priceCents',
  'isActive',
  'homeServiceEnabled',
  'homeDurationMinutes',
  'homePriceCents',
] as const;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageAlerts: UsageAlertsService,
    private readonly activity: ActivityService,
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

    await this.recordCreated(service);

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
    const before = await this.findOwnedOrThrow(professionalId, serviceId);

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

    // Diff against the stored row, so implied changes (home fields cleared
    // when home service is turned off) are captured too.
    const changes = diffFields(before, service, TRACKED_SERVICE_FIELDS, [
      'description',
    ]);
    if (Object.keys(changes).length > 0) {
      await this.activity.record(professionalId, 'SERVICE_UPDATED', {
        entityType: 'Service',
        entityId: service.id,
        subject: service.name,
        metadata: { changes },
      });
    }

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

    await this.activity.record(professionalId, 'SERVICE_DELETED', {
      entityType: 'Service',
      entityId: service.id,
      subject: service.name,
      metadata: { name: service.name },
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

    await this.recordCreated(service, source.id);

    await this.usageAlerts.checkServiceLimits(
      professionalId,
      sortOrder + 1,
      plan,
    );

    return this.toDto(service);
  }

  private recordCreated(
    service: ServiceModel,
    duplicatedFromId?: string,
  ): Promise<void> {
    return this.activity.record(service.professionalId, 'SERVICE_CREATED', {
      entityType: 'Service',
      entityId: service.id,
      subject: service.name,
      metadata: {
        name: service.name,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
        homeServiceEnabled: service.homeServiceEnabled,
        ...(duplicatedFromId ? { duplicatedFromId } : {}),
      },
    });
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

      const account = await tx.professional.findUniqueOrThrow({
        where: { id: professionalId },
        select: { plan: true, trialStartedAt: true, trialEndsAt: true },
      });
      const limit = PLAN_SERVICE_LIMITS[effectivePlan(account)];
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
    const account = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: { plan: true, trialStartedAt: true, trialEndsAt: true },
    });
    const plan = effectivePlan(account);
    const limit = PLAN_SERVICE_LIMITS[plan];
    if (limit === null) return plan;

    // Locked services count too: data kept from a bigger plan or an ended
    // trial is preserved, but no new service fits until the catalog is
    // back under the limit.
    const count = await this.prisma.service.count({
      where: { professionalId, deletedAt: null },
    });
    if (count >= limit) {
      throw new ForbiddenException(
        'Alcanzaste el límite de servicios de tu plan.',
      );
    }
    return plan;
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
