import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { copToCents, PLAN_PRICE_COP } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { BillingService } from './billing.service';
import { createBillingReference } from './billing-reference';
import { wompiIntegritySignature, sha256Hex } from './wompi-crypto';
import { WompiClient } from './wompi.client';

const PROFESSIONAL_ID = '550e8400-e29b-41d4-a716-446655440000';
const EVENTS_SECRET = 'test_events_ci';
const INTEGRITY_KEY = 'test_integrity_ci';

function eventChecksum(
  id: string,
  status: string,
  amount: number,
  timestamp: number,
): string {
  return sha256Hex(`${id}${status}${amount}${timestamp}${EVENTS_SECRET}`);
}

describe('BillingService', () => {
  let service: BillingService;
  let prisma: {
    professional: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    service: { findMany: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let wompi: {
    requireCheckoutKeys: jest.Mock;
    requireEventsSecret: jest.Mock;
    getTransaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        findUnique: jest.fn(),
        // Row as re-read after the payment is applied (trial-aware limit).
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          plan: 'BASIC',
          trialStartedAt: null,
          trialEndsAt: null,
        }),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };
    wompi = {
      requireCheckoutKeys: jest.fn().mockReturnValue({
        publicKey: 'pub_test_ci',
        integrityKey: INTEGRITY_KEY,
        sandbox: true,
      }),
      requireEventsSecret: jest.fn().mockReturnValue(EVENTS_SECRET),
      getTransaction: jest.fn(),
    };

    const mailService = {
      sendPlanUpdated: jest.fn().mockResolvedValue(undefined),
      sendPaymentApproved: jest.fn().mockResolvedValue(undefined),
      sendPaymentRejected: jest.fn().mockResolvedValue(undefined),
      sendSubscriptionCancelled: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:5173' },
        },
        { provide: WompiClient, useValue: wompi },

        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = moduleRef.get(BillingService);
  });

  describe('applyApprovedTransaction during a full-access trial', () => {
    it('stores the paid plan without locking services the trial still covers', async () => {
      const now = Date.now();
      prisma.professional.findUnique.mockResolvedValue({
        id: PROFESSIONAL_ID,
        plan: 'FREE',
        billingInterval: null,
        planExpiresAt: null,
        lastWompiTransactionId: null,
      });
      prisma.professional.findUniqueOrThrow.mockResolvedValue({
        plan: 'BASIC',
        trialStartedAt: new Date(now - 86_400_000),
        trialEndsAt: new Date(now + 10 * 86_400_000),
      });
      // 12 services > BASIC's 10: without the trial, 2 would be locked.
      prisma.service.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          id: `svc-${i}`,
          planLocked: false,
          planEnabledAt: new Date(),
        })),
      );

      const result = await service.applyApprovedTransaction({
        id: 'tx-trial-upgrade',
        status: 'APPROVED',
        amount_in_cents: copToCents(PLAN_PRICE_COP.BASIC.monthly),
        currency: 'COP',
        reference: createBillingReference(PROFESSIONAL_ID, 'BASIC', 'monthly'),
      });

      expect(result).toBe('applied');
      const [[update]] = prisma.professional.updateMany.mock.calls as [
        { data: { plan: string } },
      ][];
      expect(update.data.plan).toBe('BASIC');
      expect(prisma.service.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('createCheckout', () => {
    it('signs the catalog amount for the chosen plan', () => {
      const checkout = service.createCheckout(
        {
          id: PROFESSIONAL_ID,
          email: 'pro@example.com',
          plan: 'FREE',
        } as never,
        { plan: 'BASIC', interval: 'monthly' },
      );

      expect(checkout.amountInCents).toBe(
        copToCents(PLAN_PRICE_COP.BASIC.monthly),
      );
      expect(checkout.publicKey).toBe('pub_test_ci');
      expect(checkout.integrity).toBe(
        wompiIntegritySignature(
          checkout.reference,
          checkout.amountInCents,
          'COP',
          INTEGRITY_KEY,
        ),
      );
      expect(checkout.reference).toContain('BASIC');
      expect(checkout.redirectUrl).toBeNull();
    });

    it('allows switching the current plan from monthly to annual', () => {
      const checkout = service.createCheckout(
        {
          id: PROFESSIONAL_ID,
          email: 'pro@example.com',
          plan: 'BASIC',
        } as never,
        { plan: 'BASIC', interval: 'annual' },
      );

      expect(checkout.amountInCents).toBe(
        copToCents(PLAN_PRICE_COP.BASIC.annual),
      );
    });

    it('rejects paying the same plan and interval again', () => {
      expect(() =>
        service.createCheckout(
          {
            id: PROFESSIONAL_ID,
            email: 'pro@example.com',
            plan: 'BASIC',
            billingInterval: 'monthly',
          } as never,
          { plan: 'BASIC', interval: 'monthly' },
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects buying a cheaper plan', () => {
      expect(() =>
        service.createCheckout(
          {
            id: PROFESSIONAL_ID,
            email: 'pro@example.com',
            plan: 'ADVANCED',
          } as never,
          { plan: 'BASIC', interval: 'monthly' },
        ),
      ).toThrow(BadRequestException);
    });

    it('fails closed when keys are missing', () => {
      wompi.requireCheckoutKeys.mockImplementation(() => {
        throw new ServiceUnavailableException('missing');
      });
      expect(() =>
        service.createCheckout(
          {
            id: PROFESSIONAL_ID,
            email: 'pro@example.com',
            plan: 'FREE',
          } as never,
          { plan: 'BASIC', interval: 'monthly' },
        ),
      ).toThrow(ServiceUnavailableException);
    });
  });

  describe('handleWompiEvent', () => {
    it('rejects a bad checksum', async () => {
      await expect(
        service.handleWompiEvent({
          event: 'transaction.updated',
          data: { transaction: { id: 'tx-1' } },
          signature: {
            properties: ['transaction.id'],
            checksum: '00'.repeat(32),
          },
          timestamp: 1,
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.professional.update).not.toHaveBeenCalled();
    });

    it('sets the plan when the paid amount matches the catalog', async () => {
      const reference = createBillingReference(
        PROFESSIONAL_ID,
        'BASIC',
        'monthly',
      );
      const amount = copToCents(PLAN_PRICE_COP.BASIC.monthly);
      const timestamp = 1_700_000_000;
      prisma.professional.findUnique.mockResolvedValue({
        id: PROFESSIONAL_ID,
        lastWompiTransactionId: null,
      });

      await service.handleWompiEvent({
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-approved',
            status: 'APPROVED',
            amount_in_cents: amount,
            currency: 'COP',
            reference,
          },
        },
        signature: {
          properties: [
            'transaction.id',
            'transaction.status',
            'transaction.amount_in_cents',
          ],
          checksum: eventChecksum('tx-approved', 'APPROVED', amount, timestamp),
        },
        timestamp,
      });

      expect(prisma.professional.updateMany).toHaveBeenCalled();
      const calls = prisma.professional.updateMany.mock.calls as [
        {
          where: {
            id: string;
            OR: { lastWompiTransactionId: null | { not: string } }[];
          };
          data: {
            plan: string;
            billingInterval: string;
            lastWompiTransactionId: string;
            planStartedAt: Date;
            planExpiresAt: Date;
            planCancelledAt: null;
          };
        },
      ][];
      const updateArg = calls[0][0];
      expect(updateArg.where.id).toBe(PROFESSIONAL_ID);
      expect(updateArg.where.OR).toEqual([
        { lastWompiTransactionId: null },
        { lastWompiTransactionId: { not: 'tx-approved' } },
      ]);
      expect(updateArg.data.plan).toBe('BASIC');
      expect(updateArg.data.billingInterval).toBe('monthly');
      expect(updateArg.data.lastWompiTransactionId).toBe('tx-approved');
      expect(updateArg.data.planStartedAt).toBeInstanceOf(Date);
      expect(updateArg.data.planExpiresAt).toBeInstanceOf(Date);
    });

    it('ignores an approved event whose amount does not match the catalog', async () => {
      const reference = createBillingReference(
        PROFESSIONAL_ID,
        'BUSINESS',
        'monthly',
      );
      const timestamp = 1_700_000_001;
      await service.handleWompiEvent({
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-cheap',
            status: 'APPROVED',
            amount_in_cents: 100,
            currency: 'COP',
            reference,
          },
        },
        signature: {
          properties: [
            'transaction.id',
            'transaction.status',
            'transaction.amount_in_cents',
          ],
          checksum: eventChecksum('tx-cheap', 'APPROVED', 100, timestamp),
        },
        timestamp,
      });
      expect(prisma.professional.update).not.toHaveBeenCalled();
    });
  });

  describe('syncTransaction', () => {
    it('rejects a transaction that belongs to someone else', async () => {
      wompi.getTransaction.mockResolvedValue({
        id: 'tx-1',
        status: 'APPROVED',
        amount_in_cents: copToCents(PLAN_PRICE_COP.BASIC.monthly),
        currency: 'COP',
        reference: createBillingReference(
          'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          'BASIC',
          'monthly',
        ),
      });

      await expect(
        service.syncTransaction(PROFESSIONAL_ID, { transactionId: 'tx-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
