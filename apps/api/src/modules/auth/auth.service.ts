import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type {
  AccessStatus,
  AuthResponse,
  AuthUser,
  LoginInput,
  PlatformRole,
  RegisterInput,
} from '@agendya/types';
import {
  ACCESS_DECLINED_CODE,
  ACCOUNT_NOT_FOUND_CODE,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { ensureUniqueSlug, slugify } from '../../common/utils/slug.util';
import {
  effectiveAccessStatus,
  signupAccessStatus,
  type PlatformAccessGrant,
} from './professional-allowlist';

const SALT_ROUNDS = 10;

interface ProfessionalIdentity {
  id: string;
  email: string;
  businessName: string;
  slug: string;
  role: PlatformRole;
  accessStatus?: AccessStatus | null;
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

    const accessStatus = signupAccessStatus(grant, input.email);
    const professional = await this.prisma.professional.create({
      data: {
        email: input.email,
        passwordHash,
        businessName: input.businessName,
        slug,
        role: roleFromGrant(grant),
        accessStatus,
      },
    });

    await this.ensureAllowlistGrant(professional.email, accessStatus, grant);

    return this.buildAuthResponse(professional);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const professional = await this.prisma.professional.findUnique({
      where: { email: input.email },
    });
    if (!professional) {
      throw new UnauthorizedException({
        code: ACCOUNT_NOT_FOUND_CODE,
        message:
          'No existe una cuenta con este correo. Verifica que esté bien escrito o regístrate.',
      });
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

    this.assertNotDeclined(professional.accessStatus);

    return this.buildAuthResponse(professional);
  }

  async googleLogin(googleUser: GoogleUser): Promise<AuthResponse> {
    const grant = await this.lookupAccessGrant(googleUser.email);

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
        const accessStatus = signupAccessStatus(grant, googleUser.email);

        professional = await this.prisma.professional.create({
          data: {
            email: googleUser.email,
            googleId: googleUser.googleId,
            businessName,
            slug,
            photoUrl: googleUser.photoUrl,
            role: roleFromGrant(grant),
            accessStatus,
          },
        });

        await this.ensureAllowlistGrant(
          professional.email,
          accessStatus,
          grant,
        );
      }
    }

    this.assertNotDeclined(professional.accessStatus);

    return this.buildAuthResponse(professional);
  }

  toAuthUser(professional: ProfessionalIdentity): AuthUser {
    return {
      id: professional.id,
      email: professional.email,
      businessName: professional.businessName,
      slug: professional.slug,
      role: professional.role,
      accessStatus: effectiveAccessStatus(professional.accessStatus),
    };
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

  /**
   * Open signup (local/CI) creates APPROVED accounts without a prior grant.
   * Mirror them into PlatformAccessEmail so Super Admin's "Lista de acceso"
   * matches who already has access.
   */
  private async ensureAllowlistGrant(
    email: string,
    accessStatus: AccessStatus,
    grant: PlatformAccessGrant | null,
  ): Promise<void> {
    if (accessStatus !== 'APPROVED' || grant) {
      return;
    }
    await this.prisma.platformAccessEmail.upsert({
      where: { email },
      create: { email, access: 'ALLOWLISTED' },
      update: {},
    });
  }

  private buildAuthResponse(professional: ProfessionalIdentity): AuthResponse {
    const accessToken = this.jwtService.sign({
      sub: professional.id,
      email: professional.email,
    });

    return {
      accessToken,
      user: this.toAuthUser(professional),
    };
  }

  private assertNotDeclined(stored: AccessStatus | null | undefined): void {
    if (effectiveAccessStatus(stored) === 'DECLINED') {
      throw new ForbiddenException({
        code: ACCESS_DECLINED_CODE,
        message: 'Esta cuenta no tiene acceso a Agendya.',
      });
    }
  }
}

function roleFromGrant(grant: PlatformAccessGrant | null): PlatformRole {
  return grant === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'INDEPENDENT';
}
