import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import type {
  ProfessionalForPlanChange,
  ProfessionalProfile,
  Service,
} from '@agendya/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { TrialExpiryScheduler } from './../src/modules/billing/trial-expiry.scheduler';

const DAY = 24 * 60 * 60 * 1000;

describe('Full-access trial (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `trial-admin-${runId}@agendya.test`;
  const proEmail = `trial-pro-${runId}@agendya.test`;
  const password = 'supersecret123';
  let adminToken: string;
  let proToken: string;

  const server = () => app.getHttpServer();
  const asAdmin = (req: request.Test) =>
    req.set('Authorization', `Bearer ${adminToken}`);
  const asPro = (req: request.Test) =>
    req.set('Authorization', `Bearer ${proToken}`);
  const trialPath = `/admin/professionals/${encodeURIComponent(proEmail)}/trial`;

  const me = async () =>
    (await asPro(request(server()).get('/professionals/me')).expect(200))
      .body as ProfessionalProfile;
  const services = async () =>
    (await asPro(request(server()).get('/services')).expect(200))
      .body as Service[];
  const createService = (name: string) =>
    asPro(request(server()).post('/services')).send({
      name,
      durationMinutes: 30,
      priceCents: 1000000,
    });
  /** Moves the stored window into the past, as if time had passed. */
  const expireTrial = async () => {
    const row = await prisma.professional.findUniqueOrThrow({
      where: { email: proEmail },
    });
    await prisma.professional.update({
      where: { email: proEmail },
      data: {
        trialStartedAt: new Date(row.trialStartedAt!.getTime() - 60 * DAY),
        trialEndsAt: new Date(Date.now() - DAY),
      },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.platformAccessEmail.create({
      data: { email: adminEmail, access: 'SUPER_ADMIN' },
    });
    const adminRes = await request(server())
      .post('/auth/register')
      .send({
        email: adminEmail,
        password,
        businessName: `Trial Admin ${runId}`,
        acceptTerms: true,
      });
    adminToken = (adminRes.body as { accessToken: string }).accessToken;

    const proRes = await request(server())
      .post('/auth/register')
      .send({
        email: proEmail,
        password,
        businessName: `Trial Barber ${runId}`,
        acceptTerms: true,
      });
    proToken = (proRes.body as { accessToken: string }).accessToken;
    if (!adminToken || !proToken) {
      throw new Error('Registration failed in trial e2e setup');
    }
  });

  afterAll(async () => {
    await prisma.professional.deleteMany({
      where: { email: { in: [adminEmail, proEmail] } },
    });
    await prisma.platformAccessEmail.deleteMany({
      where: { email: { in: [adminEmail, proEmail] } },
    });
    await app.close();
  });

  it('starts every account without a trial, on FREE', async () => {
    const profile = await me();
    expect(profile.plan).toBe('FREE');
    expect(profile.effectivePlan).toBe('FREE');
    expect(profile.trial).toBeNull();
  });

  describe('security', () => {
    it('rejects unauthenticated trial actions', async () => {
      await request(server()).post(trialPath).send({}).expect(401);
    });

    it('does not let a professional grant themselves a trial', async () => {
      await asPro(request(server()).post(trialPath)).send({}).expect(403);
      await asPro(request(server()).post(`${trialPath}/extend`))
        .send({ days: 30 })
        .expect(403);
    });

    it('ignores trial/plan fields sent through the profile update', async () => {
      await asPro(request(server()).patch('/professionals/me'))
        .send({
          plan: 'BUSINESS',
          trialStartedAt: new Date().toISOString(),
          trialEndsAt: '2099-01-01T00:00:00.000Z',
        })
        .expect(200);
      const profile = await me();
      expect(profile.effectivePlan).toBe('FREE');
      expect(profile.trial).toBeNull();
    });

    it('does not let an admin grant a trial to their own account', async () => {
      await asAdmin(
        request(server()).post(
          `/admin/professionals/${encodeURIComponent(adminEmail)}/trial`,
        ),
      )
        .send({})
        .expect(403);
    });
  });

  describe('account search (type-ahead)', () => {
    it('finds accounts by partial email for a Super Admin', async () => {
      const res = await asAdmin(request(server()).get('/admin/professionals'))
        .query({ q: `trial-pro-${runId}`.slice(0, 12) })
        .expect(200);
      const emails = (res.body as { email: string }[]).map((r) => r.email);
      expect(emails).toContain(proEmail);
    });

    it('finds accounts by business name, case-insensitively', async () => {
      const res = await asAdmin(request(server()).get('/admin/professionals'))
        .query({ q: `TRIAL BARBER ${runId}` })
        .expect(200);
      expect(res.body).toEqual([
        expect.objectContaining({ email: proEmail, trialActive: false }),
      ]);
    });

    it('rejects queries shorter than three characters', async () => {
      await asAdmin(request(server()).get('/admin/professionals'))
        .query({ q: 'tr' })
        .expect(400);
    });

    it('is Super Admin only', async () => {
      await asPro(request(server()).get('/admin/professionals'))
        .query({ q: 'trial' })
        .expect(403);
    });
  });

  describe('lifecycle', () => {
    it('grants a 30-day full-access trial and audits it', async () => {
      const before = Date.now();
      const res = await asAdmin(request(server()).post(trialPath))
        .send({ note: 'Piloto' })
        .expect(201);
      const detail = res.body as ProfessionalForPlanChange;

      expect(detail.plan).toBe('FREE');
      expect(detail.effectivePlan).toBe('BUSINESS');
      expect(detail.trial?.active).toBe(true);
      const startedAt = new Date(detail.trial!.startedAt).getTime();
      const endsAt = new Date(detail.trial!.endsAt).getTime();
      expect(startedAt).toBeGreaterThanOrEqual(before - 1000);
      expect(endsAt - startedAt).toBe(30 * DAY);
      expect(detail.trialHistory).toHaveLength(1);
      expect(detail.trialHistory[0]).toMatchObject({
        action: 'GRANTED',
        actorEmail: adminEmail,
        note: 'Piloto',
      });
    });

    it('rejects an accidental second grant', async () => {
      await asAdmin(request(server()).post(trialPath)).send({}).expect(409);
    });

    it('reports full access to the professional and lifts FREE limits', async () => {
      const profile = await me();
      expect(profile.effectivePlan).toBe('BUSINESS');
      expect(profile.monthlyBookingLimit).toBeNull();
      expect(profile.trial?.active).toBe(true);

      for (let i = 1; i <= 5; i++) {
        await createService(`Servicio ${i}`).expect(201);
      }
      const list = await services();
      expect(list).toHaveLength(5);
      expect(list.every((s) => !s.planLocked)).toBe(true);
    });

    it('shows the active trial in the Registros list', async () => {
      const res = await asAdmin(
        request(server()).get('/admin/registrations'),
      ).expect(200);
      const row = (
        res.body as { email: string; plan: string; trial: unknown }[]
      ).find((r) => r.email === proEmail);
      expect(row?.plan).toBe('FREE');
      expect(row?.trial).toEqual(expect.objectContaining({ active: true }));
    });

    it('extends an active trial by a bounded number of days', async () => {
      const current = (await me()).trial!;
      await asAdmin(request(server()).post(`${trialPath}/extend`))
        .send({ days: 0 })
        .expect(400);
      await asAdmin(request(server()).post(`${trialPath}/extend`))
        .send({ days: 365 })
        .expect(400);
      const res = await asAdmin(request(server()).post(`${trialPath}/extend`))
        .send({ days: 7 })
        .expect(200);
      const detail = res.body as ProfessionalForPlanChange;
      expect(
        new Date(detail.trial!.endsAt).getTime() -
          new Date(current.endsAt).getTime(),
      ).toBe(7 * DAY);
      expect(detail.trialHistory[0].action).toBe('EXTENDED');
    });

    it('treats an expired trial as FREE immediately, without any job or login', async () => {
      await expireTrial();

      const profile = await me();
      expect(profile.effectivePlan).toBe('FREE');
      expect(profile.trial?.active).toBe(false);
      expect(profile.monthlyBookingLimit).toBe(100);

      // FREE limit applies to new services; existing ones are untouched.
      await createService('Servicio 6').expect(403);
      expect(await services()).toHaveLength(5);
    });

    it('locks (never deletes) services over the FREE limit on the hourly sweep', async () => {
      await app.get(TrialExpiryScheduler).sweep(new Date());
      const list = await services();
      expect(list).toHaveLength(5);
      expect(list.filter((s) => s.planLocked)).toHaveLength(2);

      const professional = await prisma.professional.findUniqueOrThrow({
        where: { email: proEmail },
        select: { plan: true },
      });
      expect(professional.plan).toBe('FREE');
    });

    it('requires an explicit override to grant a used trial again', async () => {
      await asAdmin(request(server()).post(trialPath)).send({}).expect(409);
      const res = await asAdmin(request(server()).post(trialPath))
        .send({ allowRepeat: true })
        .expect(201);
      expect((res.body as ProfessionalForPlanChange).trial?.active).toBe(true);
      expect((await services()).every((s) => !s.planLocked)).toBe(true);
    });

    it('ends a trial early, back to FREE limits, keeping every service', async () => {
      const res = await asAdmin(request(server()).post(`${trialPath}/end`))
        .send({ note: 'Fin del piloto' })
        .expect(200);
      const detail = res.body as ProfessionalForPlanChange;
      expect(detail.effectivePlan).toBe('FREE');
      expect(detail.trial?.active).toBe(false);
      expect(detail.trialHistory.map((e) => e.action)).toEqual([
        'ENDED',
        'GRANTED',
        'EXTENDED',
        'GRANTED',
      ]);

      const list = await services();
      expect(list).toHaveLength(5);
      expect(list.filter((s) => s.planLocked)).toHaveLength(2);
      await asAdmin(request(server()).post(`${trialPath}/end`))
        .send({})
        .expect(409);
    });

    it('lets a paid plan take precedence after the trial', async () => {
      await asAdmin(
        request(server()).patch(
          `/admin/professionals/${encodeURIComponent(proEmail)}/plan`,
        ),
      )
        .send({ plan: 'ADVANCED' })
        .expect(200);
      const profile = await me();
      expect(profile.effectivePlan).toBe('ADVANCED');
      expect((await services()).every((s) => !s.planLocked)).toBe(true);
    });
  });
});
