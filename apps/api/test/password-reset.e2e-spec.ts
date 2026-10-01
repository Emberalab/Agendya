/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import * as crypto from 'crypto';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('Password Reset (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `reset-e2e-${runId}@agendya.test`;
  const password = 'oldsecret123';
  const newPassword = 'newsecret123';
  const businessName = `E2E Reset ${runId}`;

  beforeAll(async () => {
    // forgot-password allows 3 calls per fixed 60s window; this suite makes more.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: () =>
          Promise.resolve({
            totalHits: 1,
            timeToExpire: 0,
            isBlocked: false,
            timeToBlockExpire: 0,
          }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Crear cuenta de prueba
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName, acceptTerms: true })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({
      where: { professional: { email } },
    });
    await prisma.professional.deleteMany({ where: { email } });
    await app.close();
  });

  describe('POST /auth/forgot-password', () => {
    it('returns 200 for existing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200)
        .expect({ success: true });
    });

    it('returns 200 for non-existent email (same response for security)', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: `noexiste-${Date.now()}@test.com` })
        .expect(200)
        .expect({ success: true });
    });

    it('invalidates previous tokens when creating a new one', async () => {
      // Solicitar primer token
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);

      // Solicitar segundo token
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);

      // Verificar que el token anterior fue marcado como usado
      const professional = await prisma.professional.findUnique({
        where: { email },
        select: { id: true },
      });

      const unusedTokens = await prisma.passwordResetToken.findMany({
        where: {
          professionalId: professional.id,
          usedAt: null,
        },
      });

      // Solo debe haber un token sin usar (el más reciente)
      expect(unusedTokens.length).toBe(1);
    });
  });

  describe('POST /auth/reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      // Generar un token válido
      const tokenBytes = crypto.randomBytes(32);
      validToken = tokenBytes.toString('base64url');
      const tokenHash = crypto
        .createHash('sha256')
        .update(validToken)
        .digest('hex');

      const professional = await prisma.professional.findUnique({
        where: { email },
      });

      await prisma.passwordResetToken.create({
        data: {
          professionalId: professional.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600000), // 1 hora
        },
      });
    });

    it('resets password with valid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: validToken, password: newPassword })
        .expect(200)
        .expect({ success: true });

      // Verificar que se puede hacer login con la nueva contraseña
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: newPassword })
        .expect(200);
    });

    it('returns 400 RESET_TOKEN_INVALID when reusing the same token', async () => {
      // Usar el token una vez
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: validToken, password: newPassword })
        .expect(200);

      // Intentar reutilizarlo
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: validToken, password: 'anothernew123' })
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'RESET_TOKEN_INVALID',
      });
      expect(res.body.message).toContain('inválido');
    });

    it('returns 400 RESET_TOKEN_INVALID for expired token', async () => {
      // Crear token expirado
      const expiredTokenBytes = crypto.randomBytes(32);
      const expiredToken = expiredTokenBytes.toString('base64url');
      const expiredTokenHash = crypto
        .createHash('sha256')
        .update(expiredToken)
        .digest('hex');

      const professional = await prisma.professional.findUnique({
        where: { email },
      });

      await prisma.passwordResetToken.create({
        data: {
          professionalId: professional.id,
          tokenHash: expiredTokenHash,
          expiresAt: new Date(Date.now() - 1000), // Expirado hace 1 segundo
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: expiredToken, password: 'newpass123' })
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'RESET_TOKEN_INVALID',
      });
    });

    it('returns 400 RESET_TOKEN_INVALID for non-existent token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token-12345', password: 'newpass123' })
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'RESET_TOKEN_INVALID',
      });
    });
  });

  describe('Full flow: forgot → reset → login', () => {
    it('completes password reset flow end-to-end', async () => {
      // 1. Solicitar reset
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);

      // 2. Obtener el token de la BD (simula leer el email)
      const professional = await prisma.professional.findUnique({
        where: { email },
      });

      const resetRecord = await prisma.passwordResetToken.findFirst({
        where: { professionalId: professional.id, usedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      expect(resetRecord).toBeDefined();

      // 3. Para probar, necesitamos generar un token nuevo porque no tenemos acceso al token original
      // (solo se guarda el hash). En producción, el token viene del email.
      const testTokenBytes = crypto.randomBytes(32);
      const testToken = testTokenBytes.toString('base64url');
      const testTokenHash = crypto
        .createHash('sha256')
        .update(testToken)
        .digest('hex');

      await prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { tokenHash: testTokenHash },
      });

      // 4. Resetear contraseña
      const finalPassword = `final-${runId}`;
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: testToken, password: finalPassword })
        .expect(200);

      // 5. Login con nueva contraseña
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: finalPassword })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.user.email).toBe(email);
    });
  });
});
