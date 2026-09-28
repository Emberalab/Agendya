import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import {
  getBookingNearThreshold,
  getBookingReachedThreshold,
  getServiceNearThreshold,
  getServiceReachedThreshold,
  getUtcMonthKey,
  PLAN_LABELS,
  type Plan,
} from '@agendya/types';

/**
 * Best-effort service for sending usage limit alert emails to professionals.
 * Alerts are deduplicated using UsageLimitAlert model's unique constraint
 * (professionalId, kind, periodKey). If an insert fails with P2002 (unique
 * constraint violation), it means the alert was already sent and we skip
 * sending email again.
 *
 * All methods catch errors and log them without rethrowing — failures never
 * block the calling operation (booking creation, service creation, etc.).
 */
@Injectable()
export class UsageAlertsService {
  private readonly logger = new Logger(UsageAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Checks if professional should receive booking usage alerts and sends them.
   * Call this AFTER a booking is created/confirmed.
   *
   * @param professionalId - The professional's ID
   * @param currentCount - Current booking count in the period (including the new one)
   * @param plan - Professional's current plan
   * @param now - Optional date for testing (defaults to current UTC date)
   */
  async checkBookingLimits(
    professionalId: string,
    currentCount: number,
    plan: Plan,
    now = new Date(),
  ): Promise<void> {
    try {
      const nearThreshold = getBookingNearThreshold(plan);
      const reachedThreshold = getBookingReachedThreshold(plan);

      // No limits for this plan
      if (nearThreshold === null || reachedThreshold === null) {
        return;
      }

      const periodKey = getUtcMonthKey(now);

      // Check "reached" first — if both thresholds crossed, only send "reached"
      if (currentCount >= reachedThreshold) {
        await this.sendBookingAlert(
          professionalId,
          'BOOKINGS_REACHED',
          periodKey,
          currentCount,
          reachedThreshold,
        );
        return;
      }

      // Check "near"
      if (currentCount >= nearThreshold) {
        await this.sendBookingAlert(
          professionalId,
          'BOOKINGS_NEAR',
          periodKey,
          currentCount,
          nearThreshold,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check booking limits for professional ${professionalId}`,
        error,
      );
    }
  }

  /**
   * Checks if professional should receive service usage alerts and sends them.
   * Call this AFTER a service is created.
   *
   * @param professionalId - The professional's ID
   * @param currentCount - Current service count (including the new one)
   * @param plan - Professional's current plan
   */
  async checkServiceLimits(
    professionalId: string,
    currentCount: number,
    plan: Plan,
  ): Promise<void> {
    try {
      const nearThreshold = getServiceNearThreshold(plan);
      const reachedThreshold = getServiceReachedThreshold(plan);

      // No limits for this plan
      if (nearThreshold === null || reachedThreshold === null) {
        return;
      }

      // Period key for services is the plan name itself (alerts sent once per plan)
      const periodKey = plan;

      // Check "reached" first — if both thresholds crossed, only send "reached"
      if (currentCount >= reachedThreshold) {
        await this.sendServiceAlert(
          professionalId,
          'SERVICES_REACHED',
          periodKey,
          currentCount,
          reachedThreshold,
        );
        return;
      }

      // Check "near"
      if (currentCount >= nearThreshold) {
        await this.sendServiceAlert(
          professionalId,
          'SERVICES_NEAR',
          periodKey,
          currentCount,
          nearThreshold,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check service limits for professional ${professionalId}`,
        error,
      );
    }
  }

  private async sendBookingAlert(
    professionalId: string,
    kind: 'BOOKINGS_NEAR' | 'BOOKINGS_REACHED',
    periodKey: string,
    currentCount: number,
    threshold: number,
  ): Promise<void> {
    try {
      // Try to insert the alert record — if it fails with P2002, alert already sent
      await this.prisma.usageLimitAlert.create({
        data: {
          professionalId,
          kind,
          periodKey,
        },
      });

      // Get professional data to send email
      const professional = await this.prisma.professional.findUnique({
        where: { id: professionalId },
        select: { email: true, businessName: true, plan: true },
      });

      if (!professional) {
        this.logger.warn(
          `Professional ${professionalId} not found for usage alert`,
        );
        return;
      }

      const planLabel = PLAN_LABELS[professional.plan];

      // Send email
      if (kind === 'BOOKINGS_NEAR') {
        await this.mailService.sendUsageAlertBookingsNear(
          professional.email,
          professional.businessName,
          currentCount,
          threshold,
          planLabel,
        );
      } else {
        await this.mailService.sendUsageAlertBookingsReached(
          professional.email,
          professional.businessName,
          threshold,
          planLabel,
        );
      }

      this.logger.log(
        `Booking alert ${kind} sent to professional ${professionalId} (${currentCount}/${threshold})`,
      );
    } catch (error: unknown) {
      // P2002 = unique constraint violation = alert already sent, skip silently
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `Booking alert ${kind} already sent to professional ${professionalId} for period ${periodKey}`,
        );
        return;
      }
      // Any other error: log and don't rethrow
      this.logger.error(
        `Failed to send booking alert ${kind} to professional ${professionalId}`,
        error,
      );
    }
  }

  private async sendServiceAlert(
    professionalId: string,
    kind: 'SERVICES_NEAR' | 'SERVICES_REACHED',
    periodKey: string,
    currentCount: number,
    threshold: number,
  ): Promise<void> {
    try {
      // Try to insert the alert record — if it fails with P2002, alert already sent
      await this.prisma.usageLimitAlert.create({
        data: {
          professionalId,
          kind,
          periodKey,
        },
      });

      // Get professional data to send email
      const professional = await this.prisma.professional.findUnique({
        where: { id: professionalId },
        select: { email: true, businessName: true, plan: true },
      });

      if (!professional) {
        this.logger.warn(
          `Professional ${professionalId} not found for usage alert`,
        );
        return;
      }

      const planLabel = PLAN_LABELS[professional.plan];

      // Send email
      if (kind === 'SERVICES_NEAR') {
        await this.mailService.sendUsageAlertServicesNear(
          professional.email,
          professional.businessName,
          currentCount,
          threshold,
          planLabel,
        );
      } else {
        await this.mailService.sendUsageAlertServicesReached(
          professional.email,
          professional.businessName,
          threshold,
          planLabel,
        );
      }

      this.logger.log(
        `Service alert ${kind} sent to professional ${professionalId} (${currentCount}/${threshold})`,
      );
    } catch (error: unknown) {
      // P2002 = unique constraint violation = alert already sent, skip silently
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `Service alert ${kind} already sent to professional ${professionalId} for period ${periodKey}`,
        );
        return;
      }
      // Any other error: log and don't rethrow
      this.logger.error(
        `Failed to send service alert ${kind} to professional ${professionalId}`,
        error,
      );
    }
  }
}
