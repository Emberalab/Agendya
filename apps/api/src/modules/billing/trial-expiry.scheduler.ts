import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { enforceEffectiveServiceLimit } from '../services/service-plan-limit';

/**
 * How far back the sweep looks for ended trials. Covers a scheduler outage of
 * up to this long; the sweep is idempotent, so overlap is harmless.
 */
export const TRIAL_EXPIRY_SWEEP_LOOKBACK_DAYS = 7;

/**
 * Hourly job that materialises the service-catalog side of an ended trial.
 *
 * Entitlement itself needs no job: `effectivePlan()` derives the plan from
 * `trialEndsAt`, so limits on creating services/bookings apply the instant a
 * trial ends, whether or not anyone logs in. What *is* persisted is
 * `Service.planLocked` (which services stay bookable on the public page), so
 * this sweep re-applies the effective plan's service limit to recently ended
 * trials — locking, never deleting, services over the FREE limit.
 *
 * Idempotent and per-account isolated, like PlanExpiryScheduler. Admin "end
 * trial" applies the same limit synchronously; this covers natural expiry.
 */
@Injectable()
export class TrialExpiryScheduler {
  private readonly logger = new Logger(TrialExpiryScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  // No parameters: the cron library calls handlers with its own argument.
  @Cron(CronExpression.EVERY_HOUR)
  async handleTrialExpiry(): Promise<void> {
    if (process.env.DISABLE_SCHEDULED_JOBS === 'true') {
      this.logger.debug(
        'Skipping trial expiry job (DISABLE_SCHEDULED_JOBS=true)',
      );
      return;
    }
    await this.sweep(new Date());
  }

  async sweep(now: Date): Promise<void> {
    const since = new Date(
      now.getTime() - TRIAL_EXPIRY_SWEEP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    try {
      const ended = await this.prisma.professional.findMany({
        where: { trialEndsAt: { lte: now, gt: since } },
        select: { id: true },
      });

      let applied = 0;
      for (const { id } of ended) {
        try {
          await this.prisma.$transaction((tx) =>
            enforceEffectiveServiceLimit(tx, id, now),
          );
          applied++;
        } catch (error) {
          this.logger.error(
            `Failed to apply post-trial limits to ${id}: ${String(error)}`,
          );
        }
      }

      if (ended.length > 0) {
        this.logger.log(
          `Trial expiry job: limits re-applied to ${applied}/${ended.length} ended trials`,
        );
      }
    } catch (error) {
      this.logger.error(`Trial expiry job failed: ${String(error)}`);
    }
  }
}
