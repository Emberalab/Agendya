/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';

const activityService = {
  record: jest.fn().mockResolvedValue(undefined),
  recordDailyVisit: jest.fn().mockResolvedValue(undefined),
};
import { MailService } from '../../infra/mail/mail.service';
import { AuthService } from './auth.service';

type CreateCall = [
  {
    data: {
      email: string;
      passwordHash: string;
      businessName: string;
      slug: string;
      role: string;
      accessStatus: string;
    };
  },
];

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    professional: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    platformAccessEmail: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    passwordResetToken: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let mailService: {
    sendWelcomePending: jest.Mock;
    sendWelcomeApproved: jest.Mock;
    sendForgotPassword: jest.Mock;
    sendPasswordChanged: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      platformAccessEmail: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    mailService = {
      sendWelcomePending: jest.fn().mockResolvedValue(undefined),
      sendWelcomeApproved: jest.fn().mockResolvedValue(undefined),
      sendForgotPassword: jest.fn().mockResolvedValue(undefined),
      sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('creates a new professional with a hashed password and a unique slug', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.professional.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'prof-1', ...data }),
      );

      const result = await authService.register({
        email: 'maria@example.com',
        password: 'supersecret',
        acceptTerms: true,
        businessName: 'María Belleza',
      });

      const [[createArgs]] = prisma.professional.create.mock
        .calls as CreateCall[];
      expect(createArgs.data.email).toBe('maria@example.com');
      expect(createArgs.data.slug).toBe('maria-belleza');

      const passwordMatches = await bcrypt.compare(
        'supersecret',
        createArgs.data.passwordHash,
      );
      expect(passwordMatches).toBe(true);

      expect(result).toEqual({
        accessToken: 'signed-jwt',
        user: {
          id: 'prof-1',
          email: 'maria@example.com',
          businessName: 'María Belleza',
          slug: 'maria-belleza',
          role: 'INDEPENDENT',
          accessStatus: 'PENDING',
        },
      });
    });

    it('creates a PENDING account when the email is outside the env allowlist', async () => {
      const previous = process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      process.env.PROFESSIONAL_EMAIL_ALLOWLIST = 'hjose0650@gmail.com';
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.professional.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'prof-pending', ...data }),
      );

      try {
        const result = await authService.register({
          email: 'intruso@gmail.com',
          password: 'supersecret',
          acceptTerms: true,
          businessName: 'Intruso',
        });

        const [[createArgs]] = prisma.professional.create.mock
          .calls as CreateCall[];
        expect(createArgs.data.accessStatus).toBe('PENDING');
        expect(result.user.accessStatus).toBe('PENDING');
      } finally {
        if (previous === undefined) {
          delete process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
        } else {
          process.env.PROFESSIONAL_EMAIL_ALLOWLIST = previous;
        }
      }
    });

    it('throws ConflictException if the email is already registered', async () => {
      prisma.professional.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({
          email: 'maria@example.com',
          password: 'supersecret',
          acceptTerms: true,
          businessName: 'María Belleza',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('appends a numeric suffix when the slug is already taken', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.findFirst
        .mockResolvedValueOnce({ id: 'other-professional' })
        .mockResolvedValueOnce(null);
      prisma.professional.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'prof-2', ...data }),
      );

      await authService.register({
        email: 'maria2@example.com',
        password: 'supersecret',
        acceptTerms: true,
        businessName: 'María Belleza',
      });

      const [[createArgs]] = prisma.professional.create.mock
        .calls as CreateCall[];
      expect(createArgs.data.slug).toBe('maria-belleza-2');
    });

    it('assigns INDEPENDENT role when there is no SUPER_ADMIN grant', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.professional.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'prof-1', ...data }),
      );

      await authService.register({
        email: 'regular@example.com',
        password: 'supersecret',
        acceptTerms: true,
        businessName: 'Regular User',
      });

      const [[createArgs]] = prisma.professional.create.mock
        .calls as CreateCall[];
      expect(createArgs.data.role).toBe('INDEPENDENT');
    });

    it('assigns SUPER_ADMIN role from a PlatformAccessEmail grant', async () => {
      prisma.platformAccessEmail.findUnique.mockResolvedValue({
        access: 'SUPER_ADMIN',
      });
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.professional.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'admin-1', ...data }),
      );

      await authService.register({
        email: 'admin@agendya.test',
        password: 'supersecret',
        acceptTerms: true,
        businessName: 'Agendya Admin',
      });

      const [[createArgs]] = prisma.professional.create.mock
        .calls as CreateCall[];
      expect(createArgs.data.role).toBe('SUPER_ADMIN');
    });

    it('bypasses the env allowlist for a SUPER_ADMIN grant', async () => {
      const previous = process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      process.env.PROFESSIONAL_EMAIL_ALLOWLIST = 'hjose0650@gmail.com';
      prisma.platformAccessEmail.findUnique.mockResolvedValue({
        access: 'SUPER_ADMIN',
      });

      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.professional.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'admin-1', ...data }),
      );

      await expect(
        authService.register({
          email: 'admin@agendya.test',
          password: 'supersecret',
          acceptTerms: true,
          businessName: 'Agendya Admin',
        }),
      ).resolves.toBeDefined();

      if (previous === undefined) {
        delete process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      } else {
        process.env.PROFESSIONAL_EMAIL_ALLOWLIST = previous;
      }
    });
  });

  describe('login', () => {
    it('returns an access token when credentials are valid', async () => {
      const passwordHash = await bcrypt.hash('supersecret', 10);
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'maria@example.com',
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        role: 'INDEPENDENT',
        accessStatus: 'APPROVED',
        passwordHash,
      });

      const result = await authService.login({
        email: 'maria@example.com',
        password: 'supersecret',
      });

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.user.email).toBe('maria@example.com');
      expect(result.user.role).toBe('INDEPENDENT');
      expect(result.user.accessStatus).toBe('APPROVED');
    });

    it('throws ACCOUNT_NOT_FOUND when the professional does not exist', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nope@example.com', password: 'whatever' }),
      ).rejects.toMatchObject({
        response: {
          code: 'ACCOUNT_NOT_FOUND',
          message:
            'No existe una cuenta con este correo. Verifica que esté bien escrito o regístrate.',
        },
      });
    });

    it('throws unauthorized when the password does not match', async () => {
      const passwordHash = await bcrypt.hash('supersecret', 10);
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'maria@example.com',
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        role: 'INDEPENDENT',
        accessStatus: 'APPROVED',
        passwordHash,
      });

      await expect(
        authService.login({
          email: 'maria@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ACCESS_DECLINED when Super Admin declined the account', async () => {
      const passwordHash = await bcrypt.hash('supersecret', 10);
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'maria@example.com',
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        role: 'INDEPENDENT',
        accessStatus: 'DECLINED',
        passwordHash,
      });

      await expect(
        authService.login({
          email: 'maria@example.com',
          password: 'supersecret',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'ACCESS_DECLINED',
        },
      });
    });

    it('returns PENDING while closed beta is on', async () => {
      const previous = process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      process.env.PROFESSIONAL_EMAIL_ALLOWLIST = 'other@agendya.test';
      const passwordHash = await bcrypt.hash('supersecret', 10);
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'maria@example.com',
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        role: 'INDEPENDENT',
        accessStatus: 'PENDING',
        passwordHash,
      });

      try {
        const result = await authService.login({
          email: 'maria@example.com',
          password: 'supersecret',
        });
        expect(result.user.accessStatus).toBe('PENDING');
      } finally {
        if (previous === undefined) {
          delete process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
        } else {
          process.env.PROFESSIONAL_EMAIL_ALLOWLIST = previous;
        }
      }
    });

    it('sends welcome pending email when registering outside allowlist', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.create.mockResolvedValue({
        id: 'new-1',
        email: 'nuevo@test.com',
        passwordHash: 'hash',
        businessName: 'Nuevo',
        slug: 'nuevo',
        role: 'INDEPENDENT',
        accessStatus: 'PENDING',
      });
      prisma.platformAccessEmail.findUnique.mockResolvedValue(null);
      prisma.platformAccessEmail.upsert.mockResolvedValue({});

      await authService.register({
        email: 'nuevo@test.com',
        password: 'secret',
        acceptTerms: true,
        businessName: 'Nuevo',
      });

      expect(mailService.sendWelcomePending).toHaveBeenCalledWith(
        'nuevo@test.com',
        'Nuevo',
      );
      expect(mailService.sendWelcomeApproved).not.toHaveBeenCalled();
    });

    it('sends welcome approved email when email is in allowlist', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.create.mockResolvedValue({
        id: 'new-1',
        email: 'aprobado@test.com',
        passwordHash: 'hash',
        businessName: 'Aprobado',
        slug: 'aprobado',
        role: 'INDEPENDENT',
        accessStatus: 'APPROVED',
      });
      prisma.platformAccessEmail.findUnique.mockResolvedValue({
        id: 'grant-1',
        email: 'aprobado@test.com',
        access: 'ALLOWLISTED',
        createdAt: new Date(),
      });
      prisma.platformAccessEmail.upsert.mockResolvedValue({});

      await authService.register({
        email: 'aprobado@test.com',
        password: 'secret',
        acceptTerms: true,
        businessName: 'Aprobado',
      });

      expect(mailService.sendWelcomeApproved).toHaveBeenCalledWith(
        'aprobado@test.com',
        'Aprobado',
      );
      expect(mailService.sendWelcomePending).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('returns success for non-existent email without sending email', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);

      const result = await authService.forgotPassword({
        email: 'noexiste@test.com',
      });

      expect(result).toEqual({ success: true });
      expect(mailService.sendForgotPassword).not.toHaveBeenCalled();
    });

    it('returns success for DECLINED account without sending email', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'declined@test.com',
        accessStatus: 'DECLINED',
      });

      const result = await authService.forgotPassword({
        email: 'declined@test.com',
      });

      expect(result).toEqual({ success: true });
      expect(mailService.sendForgotPassword).not.toHaveBeenCalled();
    });

    it('invalidates previous unused tokens before creating new one', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'user@test.com',
        accessStatus: 'APPROVED',
      });
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 2 });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        professionalId: 'prof-1',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      await authService.forgotPassword({ email: 'user@test.com' });

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('stores only SHA-256 hash of the token, not the token itself', async () => {
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'user@test.com',
        accessStatus: 'APPROVED',
      });
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'stored-hash',
        professionalId: 'prof-1',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      await authService.forgotPassword({ email: 'user@test.com' });

      const createCall = prisma.passwordResetToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).toBeDefined();
      expect(createCall.data.tokenHash.length).toBe(64); // SHA-256 hex = 64 chars
    });
  });

  describe('resetPassword', () => {
    it('resets password with valid token', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        professionalId: 'prof-1',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
        professional: {
          id: 'prof-1',
          email: 'user@test.com',
          accessStatus: 'APPROVED',
        },
      });

      const mockTx = {
        passwordResetToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        professional: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      const result = await authService.resetPassword({
        token: 'valid-token',
        password: 'newsecret',
      });

      expect(result).toEqual({ success: true });
      expect(mockTx.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'token-1',
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockTx.professional.update).toHaveBeenCalled();
      expect(mailService.sendPasswordChanged).toHaveBeenCalledWith(
        'user@test.com',
      );
    });

    it('throws RESET_TOKEN_INVALID for expired token', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        professionalId: 'prof-1',
        expiresAt: pastDate,
        usedAt: null,
        createdAt: new Date(),
        professional: {
          id: 'prof-1',
          email: 'user@test.com',
          accessStatus: 'APPROVED',
        },
      });

      await expect(
        authService.resetPassword({
          token: 'expired-token',
          password: 'newsecret',
        }),
      ).rejects.toMatchObject({
        response: { code: 'RESET_TOKEN_INVALID' },
      });
    });

    it('throws RESET_TOKEN_INVALID for already used token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        professionalId: 'prof-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        professional: {
          id: 'prof-1',
          email: 'user@test.com',
          accessStatus: 'APPROVED',
        },
      });

      await expect(
        authService.resetPassword({
          token: 'used-token',
          password: 'newsecret',
        }),
      ).rejects.toMatchObject({
        response: { code: 'RESET_TOKEN_INVALID' },
      });
    });

    it('throws RESET_TOKEN_INVALID for non-existent token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: 'invalid-token',
          password: 'newsecret',
        }),
      ).rejects.toMatchObject({
        response: { code: 'RESET_TOKEN_INVALID' },
      });
    });

    it('does not update password when count is 0 (race condition)', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        professionalId: 'prof-1',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
        professional: {
          id: 'prof-1',
          email: 'user@test.com',
          accessStatus: 'APPROVED',
        },
      });

      const mockTx = {
        passwordResetToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        professional: {
          update: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await expect(
        authService.resetPassword({
          token: 'concurrent-token',
          password: 'newsecret',
        }),
      ).rejects.toMatchObject({
        response: { code: 'RESET_TOKEN_INVALID' },
      });

      expect(mockTx.professional.update).not.toHaveBeenCalled();
      expect(mailService.sendPasswordChanged).not.toHaveBeenCalled();
    });

    it('allows Google-only account to set a password via reset', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        professionalId: 'prof-1',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
        professional: {
          id: 'prof-1',
          email: 'googleuser@test.com',
          accessStatus: 'APPROVED',
        },
      });

      const mockTx = {
        passwordResetToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        professional: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      const result = await authService.resetPassword({
        token: 'valid-token',
        password: 'newsecret',
      });

      expect(result).toEqual({ success: true });
      expect(mockTx.professional.update).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
        data: { passwordHash: expect.any(String) },
      });
    });
  });
});
