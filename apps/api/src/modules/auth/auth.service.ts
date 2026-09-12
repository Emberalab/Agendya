import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type {
  AuthResponse,
  LoginInput,
  PlatformRole,
  RegisterInput,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { ensureUniqueSlug, slugify } from '../../common/utils/slug.util';
import {
  assertProfessionalEmailAllowed,
  type PlatformAccessGrant,
} from './professional-allowlist';

const SALT_ROUNDS = 10;

interface ProfessionalIdentity {
  id: string;
  email: string;
  businessName: string;
  slug: string;
  role: PlatformRole;
}

export interface GoogleUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const grant = await this.lookupAccessGrant(input.email);
    await assertProfessionalEmailAllowed(input.email, () => grant);

    const existing = await this.prisma.professional.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado.');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const slug = await ensureUniqueSlug(
      this.prisma,
      slugify(input.businessName),
    );

    const professional = await this.prisma.professional.create({
      data: {
        email: input.email,
        passwordHash,
        businessName: input.businessName,
        slug,
        role: roleFromGrant(grant),
      },
    });

    return this.buildAuthResponse(professional);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const grant = await this.lookupAccessGrant(input.email);
    await assertProfessionalEmailAllowed(input.email, () => grant);

    const professional = await this.prisma.professional.findUnique({
      where: { email: input.email },
    });
    if (!professional) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!professional.passwordHash) {
      throw new UnauthorizedException(
        'Esta cuenta usa autenticación con Google.',
      );
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      professional.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this.buildAuthResponse(professional);
  }

  async googleLogin(googleUser: GoogleUser): Promise<AuthResponse> {
    const grant = await this.lookupAccessGrant(googleUser.email);
    await assertProfessionalEmailAllowed(googleUser.email, () => grant);

    let professional = await this.prisma.professional.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (!professional) {
      professional = await this.prisma.professional.findUnique({
        where: { email: googleUser.email },
      });

      if (professional) {
        professional = await this.prisma.professional.update({
          where: { id: professional.id },
          data: { googleId: googleUser.googleId },
        });
      } else {
        const businessName = `${googleUser.firstName} ${googleUser.lastName}`;
        const slug = await ensureUniqueSlug(this.prisma, slugify(businessName));

        professional = await this.prisma.professional.create({
          data: {
            email: googleUser.email,
            googleId: googleUser.googleId,
            businessName,
            slug,
            photoUrl: googleUser.photoUrl,
            role: roleFromGrant(grant),
          },
        });
      }
    }

    return this.buildAuthResponse(professional);
  }

  private async lookupAccessGrant(
    email: string,
  ): Promise<PlatformAccessGrant | null> {
    const row = await this.prisma.platformAccessEmail.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { access: true },
    });
    return row?.access ?? null;
  }

  private buildAuthResponse(professional: ProfessionalIdentity): AuthResponse {
    const accessToken = this.jwtService.sign({
      sub: professional.id,
      email: professional.email,
    });

    return {
      accessToken,
      user: {
        id: professional.id,
        email: professional.email,
        businessName: professional.businessName,
        slug: professional.slug,
        role: professional.role,
      },
    };
  }
}

function roleFromGrant(grant: PlatformAccessGrant | null): PlatformRole {
  return grant === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'INDEPENDENT';
}
