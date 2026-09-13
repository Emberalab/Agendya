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
    professional: { findUnique: jest.Mock; update: jest.Mock };
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
        update: jest.fn(),
      },
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:5173' },
        },
        { provide: WompiClient, useValue: wompi },
      ],
    }).compile();

    service = moduleRef.get(BillingService);
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

      expect(prisma.professional.update).toHaveBeenCalledWith({
        where: { id: PROFESSIONAL_ID },
        data: expect.objectContaining({
          plan: 'BASIC',
          billingInterval: 'monthly',
          lastWompiTransactionId: 'tx-approved',
        }),
      });
      const startedAt = prisma.professional.update.mock.calls[0][0].data
        .planStartedAt as Date;
      expect(startedAt).toBeInstanceOf(Date);
      const expiresAt = prisma.professional.update.mock.calls[0][0].data
        .planExpiresAt as Date;
      expect(expiresAt).toBeInstanceOf(Date);
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
