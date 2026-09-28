import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Professional } from '@prisma/client';
import {
  PLAN_PRICE_COP,
  copToCents,
  planPeriodEnd,
  planRank,
  type BillingCheckoutResponse,
  type BillingSyncResult,
  type CreateBillingCheckoutInput,
  type SyncBillingTransactionInput,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { enforceServiceLimit } from '../services/service-plan-limit';
import {
  createBillingReference,
  parseBillingReference,
} from './billing-reference';
import {
  verifyWompiEventChecksum,
  wompiIntegritySignature,
} from './wompi-crypto';
import { WompiClient, type WompiTransaction } from './wompi.client';

type WompiEventBody = {
  event?: string;
  data?: unknown;
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly wompi: WompiClient,
    private readonly mailService: MailService,
  ) {}

  createCheckout(
    professional: Professional,
    input: CreateBillingCheckoutInput,
  ): BillingCheckoutResponse {
    if (planRank(input.plan) < planRank(professional.plan)) {
      throw new BadRequestException(
        'Ya tienes un plan igual o superior a ese.',
      );
    }
    if (
      professional.plan === input.plan &&
      professional.billingInterval === input.interval
    ) {
      throw new BadRequestException('Ya estás en ese ciclo de facturación.');
    }
    if (
      professional.plan === input.plan &&
      professional.billingInterval === 'annual' &&
      input.interval === 'monthly'
    ) {
      throw new BadRequestException(
        'Ya pagaste el año. El mensual queda para cuando venza.',
      );
    }

    const { publicKey, integrityKey } = this.wompi.requireCheckoutKeys();
    const amountInCents = copToCents(
      PLAN_PRICE_COP[input.plan][input.interval],
    );
    const reference = createBillingReference(
      professional.id,
      input.plan,
      input.interval,
    );
    const webUrl = (
      this.configService.get<string>('webUrl') ?? 'http://localhost:5173'
    ).replace(/\/+$/, '');
    // Wompi checkout returns 403 when redirect-url is http://localhost.
    // The widget callback + POST /billing/sync still apply the plan.
    const redirectUrl = webUrl.startsWith('https://')
      ? `${webUrl}/dashboard/profile`
      : null;

    return {
      publicKey,
      currency: 'COP',
      amountInCents,
      reference,
      integrity: wompiIntegritySignature(
        reference,
        amountInCents,
        'COP',
        integrityKey,
      ),
      redirectUrl,
      customerEmail: professional.email,
    };
  }

  async handleWompiEvent(
    body: WompiEventBody,
    checksumHeader?: string,
  ): Promise<{ received: true }> {
    const eventsSecret = this.wompi.requireEventsSecret();
    const properties = body.signature?.properties;
    const checksum = checksumHeader || body.signature?.checksum;
    if (
      !Array.isArray(properties) ||
      properties.length === 0 ||
      typeof checksum !== 'string' ||
      typeof body.timestamp !== 'number'
    ) {
      throw new UnauthorizedException('Evento de Wompi incompleto.');
    }

    const authentic = verifyWompiEventChecksum({
      data: body.data,
      properties,
      timestamp: body.timestamp,
      checksum,
      eventsSecret,
    });
    if (!authentic) {
      throw new UnauthorizedException('Firma de evento Wompi inválida.');
    }

    if (body.event !== 'transaction.updated') {
      return { received: true };
    }

    const transaction = this.readEventTransaction(body.data);
    if (!transaction) {
      this.logger.warn('Wompi event missing transaction payload');
      return { received: true };
    }

    if (transaction.status === 'APPROVED') {
      await this.applyApprovedTransaction(transaction);
    } else if (
      transaction.status === 'DECLINED' ||
      transaction.status === 'ERROR'
    ) {
      await this.handleRejectedPayment(transaction);
    }
    return { received: true };
  }

  async syncTransaction(
    professionalId: string,
    input: SyncBillingTransactionInput,
  ): Promise<BillingSyncResult> {
    const transaction = input.transactionId
      ? await this.wompi.getTransaction(input.transactionId)
      : input.reference
        ? await this.wompi.findTransactionByReference(input.reference)
        : null;
    if (!transaction) {
      throw new NotFoundException('No encontramos esa transacción en Wompi.');
    }

    const parsed = parseBillingReference(transaction.reference);
    if (!parsed || parsed.professionalId !== professionalId) {
      throw new ForbiddenException(
        'Esa transacción no corresponde a tu cuenta.',
      );
    }

    if (transaction.status !== 'APPROVED') {
      return {
        applied: false,
        status: transaction.status,
        plan: null,
        interval: null,
      };
    }

    const result = await this.applyApprovedTransaction(transaction);
    return {
      applied: result === 'applied' || result === 'duplicate',
      status: transaction.status,
      plan: result === 'applied' || result === 'duplicate' ? parsed.plan : null,
      interval:
        result === 'applied' || result === 'duplicate' ? parsed.interval : null,
    };
  }

  /**
   * Apply an approved Wompi transaction to a professional's account.
   * Implements true idempotency and handles renewal logic correctly.
   *
   * Returns:
   * - `'applied'`: Transaction was newly applied
   * - `'duplicate'`: Transaction was already applied (idempotent)
   * - `'ignored'`: Transaction was rejected (invalid data)
   *
   * Renewal logic:
   * - If plan/interval matches and planExpiresAt is in the future (early renewal),
   *   extend from planExpiresAt instead of now
   * - Otherwise (upgrade, downgrade, or expired), start from now
   *
   * Side effects:
   * - Clears planCancelledAt on successful payment
   * - Calls enforceServiceLimit on plan transitions
   */
  async applyApprovedTransaction(
    transaction: WompiTransaction,
  ): Promise<'applied' | 'duplicate' | 'ignored'> {
    const parsed = parseBillingReference(transaction.reference);
    if (!parsed) {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: unreadable reference`,
      );
      return 'ignored';
    }

    if (transaction.currency !== 'COP') {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: currency ${transaction.currency}`,
      );
      return 'ignored';
    }

    const expectedCents = copToCents(
      PLAN_PRICE_COP[parsed.plan][parsed.interval],
    );
    if (transaction.amount_in_cents !== expectedCents) {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: amount ${transaction.amount_in_cents} ≠ ${expectedCents}`,
      );
      return 'ignored';
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: parsed.professionalId },
      select: {
        id: true,
        plan: true,
        billingInterval: true,
        planExpiresAt: true,
        lastWompiTransactionId: true,
      },
    });
    if (!professional) {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: unknown professional`,
      );
      return 'ignored';
    }

    // True idempotency using updateMany with conditional where
    const now = new Date();
    const isRenewal =
      professional.plan === parsed.plan &&
      professional.billingInterval === parsed.interval &&
      professional.planExpiresAt &&
      professional.planExpiresAt > now;

    const planStartedAt = isRenewal ? professional.planExpiresAt : now;
    const planExpiresAt = planPeriodEnd(planStartedAt!, parsed.interval);

    const result = await this.prisma.professional.updateMany({
      where: {
        id: professional.id,
        // SQL `<>` never matches NULL, so a first-ever payment needs its own branch.
        OR: [
          { lastWompiTransactionId: null },
          { lastWompiTransactionId: { not: transaction.id } },
        ],
      },
      data: {
        plan: parsed.plan,
        billingInterval: parsed.interval,
        planStartedAt,
        planExpiresAt,
        planCancelledAt: null, // Clear cancellation on payment
        lastWompiTransactionId: transaction.id,
      },
    });

    if (result.count === 0) {
      // Transaction already applied by another process
      this.logger.log(
        `Duplicate: tx ${transaction.id} already applied to ${professional.id}`,
      );
      return 'duplicate';
    }

    this.logger.log(
      `Plan ${parsed.plan} (${parsed.interval}) until ${planExpiresAt.toISOString()} ${isRenewal ? 'renewed' : 'applied'} to ${professional.id} from ${transaction.id}`,
    );

    // Fetch professional details for email
    const professionalForEmail = await this.prisma.professional.findUnique({
      where: { id: professional.id },
      select: { email: true, businessName: true },
    });

    await this.prisma.$transaction((tx) =>
      enforceServiceLimit(tx, professional.id, parsed.plan),
    );

    // Send "Pago aprobado" email
    if (professionalForEmail) {
      const amountFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(transaction.amount_in_cents / 100);

      await this.mailService.sendPaymentApproved(
        professionalForEmail.email,
        professionalForEmail.businessName ?? 'Cliente',
        parsed.plan,
        parsed.interval,
        amountFormatted,
        planExpiresAt,
      );
    }

    return 'applied';
  }

  /**
   * Handle rejected payment (DECLINED or ERROR status from webhook).
   * Uses BillingNotice table to ensure email is sent exactly once per transaction.
   *
   * Idempotency:
   * - Unique constraint on BillingNotice.transactionId prevents duplicates
   * - P2002 error (unique violation) means email already sent → gracefully return
   * - Only sends email on successful insert
   *
   * @param transaction - Wompi transaction with DECLINED or ERROR status
   */
  async handleRejectedPayment(transaction: WompiTransaction): Promise<void> {
    const parsed = parseBillingReference(transaction.reference);
    if (!parsed) {
      this.logger.warn(
        `Skipping rejected payment email for tx ${transaction.id}: unreadable reference`,
      );
      return;
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: parsed.professionalId },
      select: { id: true, email: true, businessName: true },
    });
    if (!professional) {
      this.logger.warn(
        `Skipping rejected payment email for tx ${transaction.id}: unknown professional`,
      );
      return;
    }

    try {
      // Attempt to create notice record - unique constraint ensures idempotency
      await this.prisma.billingNotice.create({
        data: {
          transactionId: transaction.id,
          kind: 'payment_rejected',
          professionalId: professional.id,
        },
      });

      this.logger.log(
        `Rejected payment notice created for tx ${transaction.id}, professional ${professional.id}`,
      );

      // Send "Pago rechazado" email
      const amountFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(transaction.amount_in_cents / 100);

      await this.mailService.sendPaymentRejected(
        professional.email,
        professional.businessName ?? 'Cliente',
        parsed.plan,
        parsed.interval,
        amountFormatted,
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        // Unique constraint violation - email already sent
        this.logger.log(
          `Rejected payment email already sent for tx ${transaction.id}`,
        );
      } else {
        // Unexpected error - re-throw
        throw error;
      }
    }
  }

  /**
   * Cancel a paid subscription. Sets `planCancelledAt` to current timestamp,
   * but preserves plan benefits until `planExpiresAt`.
   *
   * Validation:
   * - Professional must have a paid plan (not FREE)
   * - Plan must have a future expiry date (`planExpiresAt > now`)
   * - Plan must not already be cancelled (`planCancelledAt` must be null)
   *
   * @param professionalId - Professional ID
   * @returns Updated professional data with cancellation info
   */
  async cancelSubscription(professionalId: string) {
    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: {
        id: true,
        email: true,
        businessName: true,
        plan: true,
        planExpiresAt: true,
        planCancelledAt: true,
      },
    });

    if (professional.plan === 'FREE') {
      throw new BadRequestException(
        'No tienes una suscripción activa para cancelar.',
      );
    }

    if (!professional.planExpiresAt) {
      throw new BadRequestException(
        'Tu plan no tiene fecha de vencimiento (es un plan cortesía).',
      );
    }

    if (professional.planExpiresAt <= new Date()) {
      throw new BadRequestException('Tu plan ya venció.');
    }

    if (professional.planCancelledAt) {
      throw new BadRequestException('Tu suscripción ya está cancelada.');
    }

    const updated = await this.prisma.professional.update({
      where: { id: professionalId },
      data: { planCancelledAt: new Date() },
      select: {
        plan: true,
        planExpiresAt: true,
        planCancelledAt: true,
      },
    });

    this.logger.log(
      `Subscription cancelled for ${professionalId}: plan ends ${updated.planExpiresAt?.toISOString()}`,
    );

    // Send cancellation email
    if (updated.planExpiresAt) {
      await this.mailService.sendSubscriptionCancelled(
        professional.email,
        professional.businessName ?? 'Cliente',
        professional.plan,
        updated.planExpiresAt,
      );
    }

    return updated;
  }

  /**
   * Reactivate a cancelled subscription. Clears `planCancelledAt` so the
   * subscription continues as active until `planExpiresAt`.
   *
   * Validation:
   * - Professional must have a cancelled subscription (`planCancelledAt` set)
   * - Plan must not have expired yet (`planExpiresAt > now`)
   *
   * @param professionalId - Professional ID
   * @returns Updated professional data without cancellation
   */
  async reactivateSubscription(professionalId: string) {
    const professional = await this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: {
        id: true,
        plan: true,
        planExpiresAt: true,
        planCancelledAt: true,
      },
    });

    if (!professional.planCancelledAt) {
      throw new BadRequestException('Tu suscripción no está cancelada.');
    }

    if (
      !professional.planExpiresAt ||
      professional.planExpiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'Tu plan ya venció. Necesitas renovar tu suscripción.',
      );
    }

    const updated = await this.prisma.professional.update({
      where: { id: professionalId },
      data: { planCancelledAt: null },
      select: {
        plan: true,
        planExpiresAt: true,
        planCancelledAt: true,
      },
    });

    this.logger.log(`Subscription reactivated for ${professionalId}`);

    return updated;
  }

  private readEventTransaction(data: unknown): WompiTransaction | null {
    if (!data || typeof data !== 'object' || !('transaction' in data)) {
      return null;
    }
    const raw = (data as { transaction?: Partial<WompiTransaction> })
      .transaction;
    if (
      !raw?.id ||
      !raw.status ||
      typeof raw.amount_in_cents !== 'number' ||
      !raw.currency ||
      !raw.reference
    ) {
      return null;
    }
    return {
      id: raw.id,
      status: raw.status,
      amount_in_cents: raw.amount_in_cents,
      currency: raw.currency,
      reference: raw.reference,
    };
  }
}
