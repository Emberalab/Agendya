import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  BACKOFFICE_RESET_TOKEN_INVALID_CODE,
  type BackofficeAuthResponse,
} from '@agendya/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { MailService } from './../src/infra/mail/mail.service';
import { BackofficeAuthService } from './../src/modules/backoffice/auth/backoffice-auth.service';
import { BACKOFFICE_JWT_AUDIENCE } from './../src/modules/backoffice/auth/backoffice-jwt.constants';
import { BackofficeGoogleAuthError } from './../src/modules/backoffice/auth/google-oauth.constants';

/**
 * Staff self-service auth: password recovery and Google sign-in. Email is
 * captured instead of sent so the test can read the reset token the way a
 * staff member would read it from their inbox.
 */
describe('Backoffice auth — password recovery & Google (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authService: BackofficeAuthService;
  let jwt: JwtService;

  const runId = Date.now();
  const oldPassword = 'oldpassword123';
  const sent: { kind: 'reset' | 'changed'; to: string; token?: string }[] = [];
  const mailMock = {
    sendPasswordReset: jest.fn((to: string, _name: string, token: string) => {
      sent.push({ kind: 'reset', to, token });
      return Promise.resolve();
    }),
    sendPasswordChanged: jest.fn((to: string) => {
      sent.push({ kind: 'changed', to });
      return Promise.resolve();
    }),
  };

  const email = (label: string) => `${label}-auth-e2e-${runId}@agendya.test`;
  let activeId: string;

  beforeAll(async () => {
    // Google disabled for this suite regardless of the developer's .env.
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mailMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    authService = app.get(BackofficeAuthService);
    jwt = app.get(JwtService);

    const passwordHash = bcrypt.hashSync(oldPassword, 10);
    const active = await prisma.internalUser.create({
      data: { email: email('active'), name: 'Active', passwordHash },
    });
    activeId = active.id;
    await prisma.internalUser.create({
      data: {
        email: email('inactive'),
        name: 'Inactive',
        passwordHash,
        isActive: false,
      },
    });
    await prisma.internalUser.create({
      data: { email: email('google'), name: 'Google', passwordHash },
    });
    await prisma.internalUser.create({
      data: {
        email: email('linked'),
        name: 'Linked',
        passwordHash,
        googleId: `google-linked-${runId}`,
      },
    });
  });

  afterAll(async () => {
    const users = await prisma.internalUser.findMany({
      where: { email: { contains: `-auth-e2e-${runId}@` } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({
      where: { actorInternalUserId: { in: ids } },
    });
    await prisma.internalUser.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  describe('password recovery', () => {
    it('answers the same for an unknown email and sends nothing', async () => {
      const res = await request(app.getHttpServer())
        .post('/backoffice/auth/forgot-password')
        .send({ email: email('nobody') })
        .expect(200);
      expect(res.body).toEqual({ success: true });
      expect(sent).toHaveLength(0);
    });

    it('sends nothing for a deactivated staff account', async () => {
      await request(app.getHttpServer())
        .post('/backoffice/auth/forgot-password')
        .send({ email: email('inactive') })
        .expect(200);
      expect(sent).toHaveLength(0);
    });

    it('resets the password with the emailed link, once, and ends older sessions', async () => {
      // A session issued a minute ago (before the reset).
      const olderSession = jwt.sign(
        {
          sub: activeId,
          email: email('active'),
          iat: Math.floor(Date.now() / 1000) - 60,
        },
        { audience: BACKOFFICE_JWT_AUDIENCE },
      );
      await request(app.getHttpServer())
        .get('/backoffice/auth/me')
        .set('Authorization', `Bearer ${olderSession}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/backoffice/auth/forgot-password')
        .send({ email: email('active').toUpperCase() })
        .expect(200);
      const mail = sent.find((m) => m.kind === 'reset');
      expect(mail?.to).toBe(email('active'));
      const token = mail!.token!;

      // The token is stored hashed, never in plain text.
      const stored = await prisma.internalPasswordResetToken.findFirst({
        where: { internalUserId: activeId },
      });
      expect(stored?.tokenHash).not.toBe(token);

      await request(app.getHttpServer())
        .post('/backoffice/auth/reset-password')
        .send({ token, password: 'short' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/backoffice/auth/reset-password')
        .send({ token, password: 'brandnewpassword1' })
        .expect(200);

      const reused = await request(app.getHttpServer())
        .post('/backoffice/auth/reset-password')
        .send({ token, password: 'anotherpassword1' })
        .expect(400);
      expect((reused.body as { code?: string }).code).toBe(
        BACKOFFICE_RESET_TOKEN_INVALID_CODE,
      );

      await request(app.getHttpServer())
        .post('/backoffice/auth/login')
        .send({ email: email('active'), password: oldPassword })
        .expect(401);
      const login = await request(app.getHttpServer())
        .post('/backoffice/auth/login')
        .send({ email: email('active'), password: 'brandnewpassword1' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/backoffice/auth/me')
        .set(
          'Authorization',
          `Bearer ${(login.body as BackofficeAuthResponse).accessToken}`,
        )
        .expect(200);

      // The pre-reset session no longer works.
      await request(app.getHttpServer())
        .get('/backoffice/auth/me')
        .set('Authorization', `Bearer ${olderSession}`)
        .expect(401);

      expect(sent.some((m) => m.kind === 'changed')).toBe(true);
      const audit = await prisma.auditLog.findFirst({
        where: {
          actorInternalUserId: activeId,
          action: 'INTERNAL_USER_PASSWORD_RESET',
        },
      });
      expect(audit?.entityId).toBe(activeId);
    });

    it('rejects an expired link', async () => {
      const token = crypto.randomBytes(32).toString('base64url');
      await prisma.internalPasswordResetToken.create({
        data: {
          internalUserId: activeId,
          tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      await request(app.getHttpServer())
        .post('/backoffice/auth/reset-password')
        .send({ token, password: 'brandnewpassword2' })
        .expect(400);
    });
  });

  describe('Google sign-in', () => {
    it('sends the browser back to the login with a reason when Google is not configured', async () => {
      const res = await request(app.getHttpServer())
        .get('/backoffice/auth/google')
        .expect(302);
      expect(res.headers.location).toMatch(
        /\/backoffice\/login\?error=google_unavailable$/,
      );
    });

    it('rejects a callback whose state does not match (login CSRF)', async () => {
      const res = await request(app.getHttpServer())
        .get('/backoffice/auth/google/callback?code=abc&state=forged')
        .expect(302);
      expect(res.headers.location).toMatch(/error=google_failed$/);
    });

    const expectGoogleError = async (
      promise: Promise<unknown>,
      code: string,
    ) => {
      await expect(promise).rejects.toBeInstanceOf(BackofficeGoogleAuthError);
      await promise.catch((err: BackofficeGoogleAuthError) =>
        expect(err.code).toBe(code),
      );
    };

    it('never signs in an unverified Google email', async () => {
      await expectGoogleError(
        authService.googleLogin({
          googleId: `g-unverified-${runId}`,
          email: email('google'),
          emailVerified: false,
        }),
        'google_not_allowed',
      );
    });

    it('never creates an account for an unknown email', async () => {
      await expectGoogleError(
        authService.googleLogin({
          googleId: `g-unknown-${runId}`,
          email: email('stranger'),
          emailVerified: true,
        }),
        'google_no_account',
      );
      expect(
        await prisma.internalUser.count({
          where: { email: email('stranger') },
        }),
      ).toBe(0);
    });

    it('refuses a deactivated account', async () => {
      await expectGoogleError(
        authService.googleLogin({
          googleId: `g-inactive-${runId}`,
          email: email('inactive'),
          emailVerified: true,
        }),
        'google_no_account',
      );
    });

    it('links an existing account on first sign-in, audits it, and recognises it after', async () => {
      const googleId = `g-first-${runId}`;
      const first = await authService.googleLogin({
        googleId,
        email: email('google'),
        emailVerified: true,
      });
      expect(first.user.email).toBe(email('google'));
      const linked = await prisma.internalUser.findUnique({
        where: { email: email('google') },
      });
      expect(linked?.googleId).toBe(googleId);
      expect(
        await prisma.auditLog.count({
          where: {
            actorInternalUserId: linked!.id,
            action: 'INTERNAL_USER_GOOGLE_LINKED',
          },
        }),
      ).toBe(1);

      const again = await authService.googleLogin({
        googleId,
        email: email('google'),
        emailVerified: true,
      });
      expect(again.user.id).toBe(linked!.id);
    });

    it('does not re-link an email already tied to another Google account', async () => {
      await expectGoogleError(
        authService.googleLogin({
          googleId: `g-other-${runId}`,
          email: email('linked'),
          emailVerified: true,
        }),
        'google_not_allowed',
      );
    });
  });
});
