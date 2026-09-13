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

    const applied = await this.applyApprovedTransaction(transaction);
    return {
      applied,
      status: transaction.status,
      plan: applied ? parsed.plan : null,
      interval: applied ? parsed.interval : null,
    };
  }

  async applyApprovedTransaction(
    transaction: WompiTransaction,
  ): Promise<boolean> {
    const parsed = parseBillingReference(transaction.reference);
    if (!parsed) {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: unreadable reference`,
      );
      return false;
    }

    if (transaction.currency !== 'COP') {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: currency ${transaction.currency}`,
      );
      return false;
    }

    const expectedCents = copToCents(
      PLAN_PRICE_COP[parsed.plan][parsed.interval],
    );
    if (transaction.amount_in_cents !== expectedCents) {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: amount ${transaction.amount_in_cents} ≠ ${expectedCents}`,
      );
      return false;
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: parsed.professionalId },
      select: { id: true, lastWompiTransactionId: true },
    });
    if (!professional) {
      this.logger.warn(
        `Ignoring Wompi tx ${transaction.id}: unknown professional`,
      );
      return false;
    }

    if (professional.lastWompiTransactionId === transaction.id) {
      return true;
    }

    const planStartedAt = new Date();
    const planExpiresAt = planPeriodEnd(planStartedAt, parsed.interval);
    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        plan: parsed.plan,
        billingInterval: parsed.interval,
        planStartedAt,
        planExpiresAt,
        lastWompiTransactionId: transaction.id,
      },
    });
    this.logger.log(
      `Plan ${parsed.plan} (${parsed.interval}) until ${planExpiresAt.toISOString()} applied to ${professional.id} from ${transaction.id}`,
    );
    return true;
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
