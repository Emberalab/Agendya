import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

/**
 * Web Push subscription lifecycle. Delivery itself needs VAPID keys (absent in
 * CI), but subscribe / status / unsubscribe and their per-professional scoping
 * do not — that is what this covers.
 */
describe('Push subscriptions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const emailA = `e2e-push-a-${runId}@agendya.test`;
  const emailB = `e2e-push-b-${runId}@agendya.test`;
  const password = 'supersecret123';

  let tokenA: string;
  let tokenB: string;

  const authA = () => ({ Authorization: `Bearer ${tokenA}` });
  const authB = () => ({ Authorization: `Bearer ${tokenB}` });

  const subFor = (endpoint: string) => ({
    endpoint,
    expirationTime: null,
    keys: { p256dh: 'BPm-p256dh-fake-key', auth: 'auth-fake-key' },
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const regA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailA, password, businessName: `E2E Push A ${runId}` });
    tokenA = (regA.body as { accessToken: string }).accessToken;

    const regB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailB, password, businessName: `E2E Push B ${runId}` });
    tokenB = (regB.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await prisma.pushSubscription.deleteMany({
      where: { professional: { email: { in: [emailA, emailB] } } },
    });
    await prisma.professional.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await app.close();
  });

  it('rejects unauthenticated access to every push endpoint', async () => {
    const server = app.getHttpServer();
    await request(server).get('/notifications/push/public-key').expect(401);
    await request(server).get('/notifications/push/status').expect(401);
    await request(server).post('/notifications/push/subscribe').expect(401);
    await request(server).post('/notifications/push/unsubscribe').expect(401);
  });

  it('exposes the VAPID public key (string when configured, else null)', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications/push/public-key')
      .set(authA())
      .expect(200);
    const { publicKey } = res.body as { publicKey: string | null };
    expect(publicKey === null || typeof publicKey === 'string').toBe(true);
  });

  it('validates the subscription body', async () => {
    await request(app.getHttpServer())
      .post('/notifications/push/subscribe')
      .set(authA())
      .send({ endpoint: 'not-a-url', keys: {} })
      .expect(400);
  });

  it('registers a subscription, is idempotent per endpoint, and reports status', async () => {
    const endpoint = `https://push.example/${runId}/a`;

    await request(app.getHttpServer())
      .post('/notifications/push/subscribe')
      .set(authA())
      .send(subFor(endpoint))
      .expect(204);

    // Re-subscribing the same endpoint updates in place, no duplicate row.
    await request(app.getHttpServer())
      .post('/notifications/push/subscribe')
      .set(authA())
      .send(subFor(endpoint))
      .expect(204);

    const rows = await prisma.pushSubscription.findMany({
      where: { professional: { email: emailA } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].endpoint).toBe(endpoint);

    const status = await request(app.getHttpServer())
      .get('/notifications/push/status')
      .set(authA())
      .expect(200);
    expect((status.body as { subscribed: boolean }).subscribed).toBe(true);

    // B has registered nothing.
    const statusB = await request(app.getHttpServer())
      .get('/notifications/push/status')
      .set(authB())
      .expect(200);
    expect((statusB.body as { subscribed: boolean }).subscribed).toBe(false);
  });

  it("does not let one professional unsubscribe another's endpoint", async () => {
    const endpoint = `https://push.example/${runId}/scoped`;
    await request(app.getHttpServer())
      .post('/notifications/push/subscribe')
      .set(authA())
      .send(subFor(endpoint))
      .expect(204);

    // B tries to drop A's endpoint — silently no-ops.
    await request(app.getHttpServer())
      .post('/notifications/push/unsubscribe')
      .set(authB())
      .send({ endpoint })
      .expect(204);

    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(
      1,
    );

    // A can drop its own.
    await request(app.getHttpServer())
      .post('/notifications/push/unsubscribe')
      .set(authA())
      .send({ endpoint })
      .expect(204);

    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(
      0,
    );
  });
});
