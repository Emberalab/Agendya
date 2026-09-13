import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import type { AllowlistEntry } from '@agendya/types';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `admin-e2e-${runId}@agendya.test`;
  const independentEmail = `independent-e2e-${runId}@agendya.test`;
  const password = 'supersecret123';
  const businessName = `Admin E2E ${runId}`;

  let adminToken: string;
  let independentToken: string;

  beforeAll(async () => {
    // Force allowlist to open mode for tests (empty string = open)
    process.env.PROFESSIONAL_EMAIL_ALLOWLIST = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Create SUPER_ADMIN in allowlist
    await prisma.platformAccessEmail.create({
      data: { email: adminEmail, access: 'SUPER_ADMIN' },
    });

    // Create ALLOWLISTED user for independent
    await prisma.platformAccessEmail.create({
      data: { email: independentEmail, access: 'ALLOWLISTED' },
    });

    // Register admin user
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, businessName });
    if (!(adminRes.body as { accessToken?: string }).accessToken) {
      throw new Error(
        `Admin registration failed: ${JSON.stringify(adminRes.body)}`,
      );
    }
    adminToken = (adminRes.body as { accessToken: string }).accessToken;

    // Register independent user
    const independentRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: independentEmail, password, businessName: 'Independent' });
    if (!(independentRes.body as { accessToken?: string }).accessToken) {
      throw new Error(
        `Independent registration failed: ${JSON.stringify(independentRes.body)}`,
      );
    }
    independentToken = (independentRes.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    await prisma.professional.deleteMany({
      where: { email: { in: [adminEmail, independentEmail] } },
    });
    await prisma.platformAccessEmail.deleteMany({
      where: { email: { in: [adminEmail, independentEmail] } },
    });
    await app.close();
  });

  describe('GET /admin/allowlist', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/admin/allowlist').expect(401);
    });

    it('should return 403 for INDEPENDENT user', async () => {
      await request(app.getHttpServer())
        .get('/admin/allowlist')
        .set('Authorization', `Bearer ${independentToken}`)
        .expect(403);
    });

    it('should return allowlist for SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/allowlist')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const entries = res.body as AllowlistEntry[];
      const admin = entries.find((e) => e.email === adminEmail);
      expect(admin).toBeDefined();
      expect(admin?.plan).toBe('FREE');
      const independent = entries.find((e) => e.email === independentEmail);
      expect(independent?.plan).toBe('FREE');
    });
  });

  describe('POST /admin/allowlist', () => {
    it('should return 403 for INDEPENDENT user', async () => {
      await request(app.getHttpServer())
        .post('/admin/allowlist')
        .set('Authorization', `Bearer ${independentToken}`)
        .send({ email: 'newuser@test.com', access: 'ALLOWLISTED' })
        .expect(403);
    });

    it('should create allowlist entry for SUPER_ADMIN', async () => {
      const newEmail = `new-${runId}@test.com`;
      const res = await request(app.getHttpServer())
        .post('/admin/allowlist')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: newEmail, access: 'ALLOWLISTED' })
        .expect(201);

      const created = res.body as AllowlistEntry;
      expect(created.email).toBe(newEmail);
      expect(created.access).toBe('ALLOWLISTED');
      expect(created.plan).toBeNull();

      // Cleanup
      await prisma.platformAccessEmail.delete({ where: { email: newEmail } });
    });
  });

  describe('PATCH /admin/allowlist/:email', () => {
    let testEmail: string;

    beforeAll(async () => {
      testEmail = `patch-test-${runId}@test.com`;
      await prisma.platformAccessEmail.create({
        data: { email: testEmail, access: 'ALLOWLISTED' },
      });
    });

    afterAll(async () => {
      await prisma.platformAccessEmail.deleteMany({
        where: { email: testEmail },
      });
    });

    it('should return 403 for INDEPENDENT user', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/allowlist/${testEmail}`)
        .set('Authorization', `Bearer ${independentToken}`)
        .send({ access: 'SUPER_ADMIN' })
        .expect(403);
    });

    it('should update allowlist entry for SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/allowlist/${testEmail}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ access: 'SUPER_ADMIN' })
        .expect(200);

      const updated = res.body as AllowlistEntry;
      expect(updated.email).toBe(testEmail);
      expect(updated.access).toBe('SUPER_ADMIN');
    });

    it('should prevent admin from downgrading themselves', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/allowlist/${adminEmail}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ access: 'ALLOWLISTED' })
        .expect(403);
    });
  });

  describe('DELETE /admin/allowlist/:email', () => {
    let testEmail: string;

    beforeEach(async () => {
      testEmail = `delete-test-${Date.now()}@test.com`;
      await prisma.platformAccessEmail.create({
        data: { email: testEmail, access: 'ALLOWLISTED' },
      });
    });

    it('should return 403 for INDEPENDENT user', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/allowlist/${testEmail}`)
        .set('Authorization', `Bearer ${independentToken}`)
        .expect(403);
    });

    it('should delete allowlist entry for SUPER_ADMIN', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/allowlist/${testEmail}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleted = await prisma.platformAccessEmail.findUnique({
        where: { email: testEmail },
      });
      expect(deleted).toBeNull();
    });

    it('should prevent admin from deleting themselves', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/allowlist/${adminEmail}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('GET /admin/professionals/:email', () => {
    it('should return 403 for INDEPENDENT user', async () => {
      await request(app.getHttpServer())
        .get(`/admin/professionals/${independentEmail}`)
        .set('Authorization', `Bearer ${independentToken}`)
        .expect(403);
    });

    it('should return professional data for SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/professionals/${independentEmail}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((res.body as { email: string }).email).toBe(independentEmail);
      expect((res.body as { plan: string }).plan).toBeDefined();
    });
  });

  describe('PATCH /admin/professionals/:email/plan', () => {
    it('should return 403 for INDEPENDENT user', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/professionals/${independentEmail}/plan`)
        .set('Authorization', `Bearer ${independentToken}`)
        .send({ plan: 'BASIC' })
        .expect(403);
    });

    it('rejects an invalid plan value', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/professionals/${independentEmail}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PRO' })
        .expect(400);
    });

    it('should change professional plan for SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/professionals/${independentEmail}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'BASIC' })
        .expect(200);

      expect((res.body as { plan: string }).plan).toBe('BASIC');

      // Verify in database
      const professional = await prisma.professional.findUnique({
        where: { email: independentEmail },
      });
      expect(professional?.plan).toBe('BASIC');
    });
  });
});
