import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  TRIAL_PLAN,
  PLAN_LABELS,
  hasUsedTrial,
  isTrialActive,
  planRank,
  trialEndsAtFrom,
  type EndTrialInput,
  type ExtendTrialInput,
  type GrantTrialInput,
  type ProfessionalForPlanChange,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { effectiveAccessStatus } from '../auth/professional-allowlist';
import { enforceEffectiveServiceLimit } from '../services/service-plan-limit';
import { AdminService } from './admin.service';

type Actor = Pick<Professional, 'id' | 'email'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Super Admin management of the full-access trial.
 *
 * Every action is validated here (never trusted from the client), applied
 * with an optimistic-concurrency `updateMany` so a double click or two admins
 * acting at once cannot double-grant, and recorded as an append-only
 * `TrialEvent` in the same transaction. Nothing here deletes data: ending a
 * trial only moves `trialEndsAt` and re-applies the plan's service limit,
 * which locks (never deletes) services over the limit.
 */
@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  async grantTrial(
    email: string,
    actor: Actor,
    input: GrantTrialInput,
    now: Date = new Date(),
  ): Promise<ProfessionalForPlanChange> {
    const target = await this.findTarget(email);

    if (target.id === actor.id) {
      throw new ForbiddenException(
        'No puedes activar un período de prueba en tu propia cuenta.',
      );
    }
    if (effectiveAccessStatus(target.accessStatus) !== 'APPROVED') {
      throw new BadRequestException(
        'La cuenta aún no tiene acceso aprobado a Agendya.',
      );
    }
    if (isTrialActive(target, now)) {
      throw new ConflictException(
        'Esta cuenta ya tiene un período de prueba activo. Usa "Extender".',
      );
    }
    if (hasUsedTrial(target) && !input.allowRepeat) {
      throw new ConflictException('Esta cuenta ya usó su período de prueba.');
    }
    if (planRank(target.plan) >= planRank(TRIAL_PLAN)) {
      throw new BadRequestException(
        `Esta cuenta ya tiene acceso completo con el plan ${PLAN_LABELS[target.plan]}.`,
      );
    }

    const endsAt = trialEndsAtFrom(now);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.professional.updateMany({
        // Only if nobody changed the trial since we read it.
        where: {
          id: target.id,
          trialStartedAt: target.trialStartedAt,
          trialEndsAt: target.trialEndsAt,
        },
        data: { trialStartedAt: now, trialEndsAt: endsAt },
      });
      if (count === 0) {
        throw new ConflictException(
          'El período de prueba cambió mientras tanto. Recarga e inténtalo de nuevo.',
        );
      }
      await tx.trialEvent.create({
        data: {
          professionalId: target.id,
          action: 'GRANTED',
          actorId: actor.id,
          actorEmail: actor.email,
          previousEndsAt: target.trialEndsAt,
          endsAt,
          note: input.note || null,
        },
      });
      // Unlock services a previous downgrade locked: full access now.
      await enforceEffectiveServiceLimit(tx, target.id, now);
    });

    this.logger.log(
      `Trial granted to ${target.id} by ${actor.email} until ${endsAt.toISOString()}${hasUsedTrial(target) ? ' (repeat override)' : ''}`,
    );
    return this.adminService.getProfessionalByEmail(target.email);
  }

  async extendTrial(
    email: string,
    actor: Actor,
    input: ExtendTrialInput,
    now: Date = new Date(),
  ): Promise<ProfessionalForPlanChange> {
    const target = await this.findTarget(email);
    if (!isTrialActive(target, now) || !target.trialEndsAt) {
      throw new ConflictException(
        'Solo se puede extender un período de prueba activo.',
      );
    }

    const previousEndsAt = target.trialEndsAt;
    const endsAt = new Date(previousEndsAt.getTime() + input.days * DAY_MS);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.professional.updateMany({
        where: { id: target.id, trialEndsAt: previousEndsAt },
        data: { trialEndsAt: endsAt },
      });
      if (count === 0) {
        throw new ConflictException(
          'El período de prueba cambió mientras tanto. Recarga e inténtalo de nuevo.',
        );
      }
      await tx.trialEvent.create({
        data: {
          professionalId: target.id,
          action: 'EXTENDED',
          actorId: actor.id,
          actorEmail: actor.email,
          previousEndsAt,
          endsAt,
          note: input.note || null,
        },
      });
    });

    this.logger.log(
      `Trial of ${target.id} extended by ${input.days}d by ${actor.email} until ${endsAt.toISOString()}`,
    );
    return this.adminService.getProfessionalByEmail(target.email);
  }

  async endTrial(
    email: string,
    actor: Actor,
    input: EndTrialInput,
    now: Date = new Date(),
  ): Promise<ProfessionalForPlanChange> {
    const target = await this.findTarget(email);
    if (!isTrialActive(target, now) || !target.trialEndsAt) {
      throw new ConflictException(
        'Esta cuenta no tiene un período de prueba activo.',
      );
    }

    const previousEndsAt = target.trialEndsAt;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.professional.updateMany({
        where: { id: target.id, trialEndsAt: previousEndsAt },
        data: { trialEndsAt: now },
      });
      if (count === 0) {
        throw new ConflictException(
          'El período de prueba cambió mientras tanto. Recarga e inténtalo de nuevo.',
        );
      }
      await tx.trialEvent.create({
        data: {
          professionalId: target.id,
          action: 'ENDED',
          actorId: actor.id,
          actorEmail: actor.email,
          previousEndsAt,
          endsAt: now,
          note: input.note || null,
        },
      });
      // Back to the billed plan's limits right away; excess services are
      // locked, never deleted.
      await enforceEffectiveServiceLimit(tx, target.id, now);
    });

    this.logger.log(`Trial of ${target.id} ended early by ${actor.email}`);
    return this.adminService.getProfessionalByEmail(target.email);
  }

  private async findTarget(email: string) {
    const target = await this.prisma.professional.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        plan: true,
        accessStatus: true,
        trialStartedAt: true,
        trialEndsAt: true,
      },
    });
    if (!target) {
      throw new NotFoundException(
        `No se encontró un profesional con el correo: ${email}`,
      );
    }
    return target;
  }
}
