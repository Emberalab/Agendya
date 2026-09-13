import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { copToCents, PLAN_PRICE_COP } from '@agendya/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { createBillingReference } from './../src/modules/billing/billing-reference';
import { sha256Hex } from './../src/modules/billing/wompi-crypto';

const EVENTS_SECRET = 'test_events_e2e';
const INTEGRITY_KEY = 'test_integrity_e2e';

describe('Billing (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const email = `billing-e2e-${runId}@agendya.test`;
  const password = 'supersecret123';
  let token: string;
  let professionalId: string;

  beforeAll(async () => {
    process.env.PROFESSIONAL_EMAIL_ALLOWLIST = '';
    process.env.WOMPI_PUBLIC_KEY = 'pub_test_e2e';
    process.env.WOMPI_INTEGRITY_KEY = INTEGRITY_KEY;
    process.env.WOMPI_EVENTS_SECRET = EVENTS_SECRET;
    process.env.WOMPI_SANDBOX = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName: `Billing ${runId}` });
    const body = register.body as {
      accessToken?: string;
      user?: { id: string };
    };
    if (!body.accessToken || !body.user?.id) {
      throw new Error(`Billing registration failed: ${JSON.stringify(body)}`);
    }
    token = body.accessToken;
    professionalId = body.user.id;
  });

  afterAll(async () => {
    await prisma.professional.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects checkout without a token', async () => {
    await request(app.getHttpServer())
      .post('/billing/checkout')
      .send({ plan: 'BASIC', interval: 'monthly' })
      .expect(401);
  });

  it('returns signed widget params for a paid plan', async () => {
    const res = await request(app.getHttpServer())
      .post('/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'BASIC', interval: 'monthly' })
      .expect(201);

    const checkout = res.body as {
      publicKey: string;
      currency: string;
      amountInCents: number;
      reference: string;
      integrity: string;
    };
    expect(checkout).toMatchObject({
      publicKey: 'pub_test_e2e',
      currency: 'COP',
      amountInCents: copToCents(PLAN_PRICE_COP.BASIC.monthly),
    });
    expect(checkout.reference).toContain('BASIC');
    expect(checkout.integrity).toHaveLength(64);
  });

  it('rejects an unsigned webhook', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/wompi')
      .send({ event: 'transaction.updated' })
      .expect(401);
  });

  it('applies the plan from an authentic APPROVED event', async () => {
    const reference = createBillingReference(
      professionalId,
      'ADVANCED',
      'monthly',
    );
    const amount = copToCents(PLAN_PRICE_COP.ADVANCED.monthly);
    const timestamp = 1_700_000_100;
    const checksum = sha256Hex(
      `tx-e2eAPPROVED${amount}${timestamp}${EVENTS_SECRET}`,
    );

    await request(app.getHttpServer())
      .post('/webhooks/wompi')
      .send({
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-e2e',
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
          checksum,
        },
        timestamp,
      })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/professionals/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((me.body as { plan: string }).plan).toBe('ADVANCED');
  });
});
