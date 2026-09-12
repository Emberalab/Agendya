import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';

type CreateCall = [
  {
    data: {
      email: string;
      passwordHash: string;
      businessName: string;
      slug: string;
      role: string;
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
    };
  };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      professional: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      platformAccessEmail: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
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
        },
      });
    });

    it('rejects emails outside the professional allowlist', async () => {
      const previous = process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      process.env.PROFESSIONAL_EMAIL_ALLOWLIST = 'hjose0650@gmail.com';

      await expect(
        authService.register({
          email: 'intruso@gmail.com',
          password: 'supersecret',
          businessName: 'Intruso',
        }),
      ).rejects.toThrow(ForbiddenException);

      if (previous === undefined) {
        delete process.env.PROFESSIONAL_EMAIL_ALLOWLIST;
      } else {
        process.env.PROFESSIONAL_EMAIL_ALLOWLIST = previous;
      }
    });

    it('throws ConflictException if the email is already registered', async () => {
      prisma.professional.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({
          email: 'maria@example.com',
          password: 'supersecret',
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
        passwordHash,
      });

      const result = await authService.login({
        email: 'maria@example.com',
        password: 'supersecret',
      });

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.user.email).toBe('maria@example.com');
      expect(result.user.role).toBe('INDEPENDENT');
    });

    it('throws unauthorized when the professional does not exist', async () => {
      prisma.professional.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nope@example.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws unauthorized when the password does not match', async () => {
      const passwordHash = await bcrypt.hash('supersecret', 10);
      prisma.professional.findUnique.mockResolvedValue({
        id: 'prof-1',
        email: 'maria@example.com',
        businessName: 'María Belleza',
        slug: 'maria-belleza',
        role: 'INDEPENDENT',
        passwordHash,
      });

      await expect(
        authService.login({
          email: 'maria@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
