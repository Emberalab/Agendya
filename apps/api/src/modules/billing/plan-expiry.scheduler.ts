import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BILLING_GRACE_DAYS } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { enforceServiceLimit } from '../services/service-plan-limit';

/**
 * Hourly job that downgrades expired paid plans to FREE.
 *
 * Downgrade rules:
 * - Cancelled plans (planCancelledAt set): downgrade when planExpiresAt <= now (no grace)
 * - Non-cancelled plans: downgrade when planExpiresAt + BILLING_GRACE_DAYS <= now
 *
 * Side effects:
 * - Sets plan = 'FREE'
 * - Clears billingInterval, planStartedAt, planExpiresAt, planCancelledAt
 * - Calls enforceServiceLimit to lock excess services for FREE plan
 * - Sends "Plan actualizado" email
 *
 * Idempotence:
 * - Processes each professional separately in its own transaction
 * - If a transaction fails, others continue (isolation)
 * - Re-running the job on already-processed professionals is safe (no-op)
 */
@Injectable()
export class PlanExpiryScheduler {
  private readonly logger = new Logger(PlanExpiryScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handlePlanExpiry() {
    if (process.env.DISABLE_SCHEDULED_JOBS === 'true') {
      this.logger.debug(
        'Skipping plan expiry job (DISABLE_SCHEDULED_JOBS=true)',
      );
      return;
    }

    this.logger.log('Starting plan expiry job');

    const now = new Date();
    const gracePeriodMs = BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const graceEnd = new Date(now.getTime() - gracePeriodMs);

    try {
      // Find all paid professionals with expiry dates
      const expiredProfessionals = await this.prisma.professional.findMany({
        where: {
          plan: { not: 'FREE' },
          planExpiresAt: { not: null },
        },
        select: {
          id: true,
          email: true,
          businessName: true,
          plan: true,
          planExpiresAt: true,
          planCancelledAt: true,
        },
      });

      let downgraded = 0;
      let skipped = 0;

      for (const professional of expiredProfessionals) {
        const shouldDowngrade = this.shouldDowngrade(
          professional,
          now,
          graceEnd,
        );

        if (!shouldDowngrade) {
          skipped++;
          continue;
        }

        try {
          const didDowngrade = await this.downgradeProfessional(
            professional.id,
            professional.email,
            professional.businessName,
            professional.plan,
            now,
            graceEnd,
          );
          if (didDowngrade) downgraded++;
        } catch (error) {
          this.logger.error(
            `Failed to downgrade professional ${professional.id}: ${error}`,
          );
        }
      }

      this.logger.log(
        `Plan expiry job completed: ${downgraded} downgraded, ${skipped} still active`,
      );
    } catch (error) {
      this.logger.error(`Plan expiry job failed: ${error}`);
    }
  }

  /**
   * Determine if a professional should be downgraded.
   *
   * Rules:
   * - Cancelled (planCancelledAt set): downgrade if planExpiresAt <= now
   * - Not cancelled: downgrade if planExpiresAt + grace <= now
   */
  private shouldDowngrade(
    professional: {
      planExpiresAt: Date | null;
      planCancelledAt: Date | null;
    },
    now: Date,
    graceEnd: Date,
  ): boolean {
    if (!professional.planExpiresAt) {
      return false; // Complimentary plan, never expires
    }

    if (professional.planCancelledAt) {
      // Cancelled: no grace period
      return professional.planExpiresAt <= now;
    }

    // Not cancelled: check grace period
    return professional.planExpiresAt <= graceEnd;
  }

  /**
   * Downgrade a single professional to FREE plan in a transaction.
   * Enforces service limits and sends email notification.
   */
  private async downgradeProfessional(
    professionalId: string,
    email: string,
    businessName: string | null,
    oldPlan: string,
    now: Date,
    graceEnd: Date,
  ): Promise<boolean> {
    const downgraded = await this.prisma.$transaction(async (tx) => {
      // The expiry condition is repeated in the `where` so a concurrent run
      // (or a payment that just renewed the plan) turns this into a no-op.
      const { count } = await tx.professional.updateMany({
        where: {
          id: professionalId,
          plan: { not: 'FREE' },
          OR: [
            { planCancelledAt: { not: null }, planExpiresAt: { lte: now } },
            { planCancelledAt: null, planExpiresAt: { lte: graceEnd } },
          ],
        },
        data: {
          plan: 'FREE',
          billingInterval: null,
          planStartedAt: null,
          planExpiresAt: null,
          planCancelledAt: null,
        },
      });
      if (count === 0) return false;

      await enforceServiceLimit(tx, professionalId, 'FREE');
      return true;
    });
    if (!downgraded) return false;

    this.logger.log(`Downgraded professional ${professionalId} to FREE`);

    // Send "Plan actualizado" email
    await this.mailService.sendPlanUpdated(
      email,
      businessName ?? 'Cliente',
      oldPlan,
      'FREE',
      'expired',
    );
    return true;
  }
}
