import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type {
  AccessStatus,
  AuthResponse,
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  PlatformRole,
  RegisterInput,
  ResetPasswordInput,
} from '@agendya/types';
import {
  ACCESS_DECLINED_CODE,
  ACCOUNT_NOT_FOUND_CODE,
  LEGAL_DOCUMENTS_VERSION,
  RESET_TOKEN_INVALID_CODE,
} from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import { ensureUniqueSlug, slugify } from '../../common/utils/slug.util';
import {
  effectiveAccessStatus,
  signupAccessStatus,
  type PlatformAccessGrant,
} from './professional-allowlist';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_HOURS = 1;

/**
 * Helper to create a Date instance safely for Prisma.
 * Works around eslint no-unsafe-assignment warning with Date constructor.
 */
function now(): Date {
  return new Date();
}

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
    private readonly mailService: MailService,
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
        termsAcceptedAt: now(),
        termsVersion: LEGAL_DOCUMENTS_VERSION,
      },
    });

    await this.ensureAllowlistGrant(professional.email, accessStatus, grant);

    // Enviar correo de bienvenida según accessStatus
    if (accessStatus === 'PENDING') {
      await this.mailService.sendWelcomePending(
        professional.email,
        professional.businessName,
      );
    } else if (accessStatus === 'APPROVED') {
      await this.mailService.sendWelcomeApproved(
        professional.email,
        professional.businessName,
      );
    }

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
            termsAcceptedAt: now(),
            termsVersion: LEGAL_DOCUMENTS_VERSION,
          },
        });

        await this.ensureAllowlistGrant(
          professional.email,
          accessStatus,
          grant,
        );

        // Enviar correo de bienvenida solo si es cuenta nueva
        if (accessStatus === 'PENDING') {
          await this.mailService.sendWelcomePending(
            professional.email,
            professional.businessName,
          );
        } else if (accessStatus === 'APPROVED') {
          await this.mailService.sendWelcomeApproved(
            professional.email,
            professional.businessName,
          );
        }
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

  async forgotPassword(input: ForgotPasswordInput): Promise<{ success: true }> {
    const professional = await this.prisma.professional.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, accessStatus: true },
    });

    // Siempre responde lo mismo para no revelar si el correo existe
    if (
      !professional ||
      effectiveAccessStatus(professional.accessStatus) === 'DECLINED'
    ) {
      return { success: true };
    }

    // Invalidar tokens anteriores sin usar
    await this.prisma.passwordResetToken.updateMany({
      where: {
        professionalId: professional.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Generar token aleatorio (32 bytes, base64url)
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Crear token que expira en 1 hora
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await this.prisma.passwordResetToken.create({
      data: {
        professionalId: professional.id,
        tokenHash,
        expiresAt,
      },
    });

    // Enviar correo
    await this.mailService.sendForgotPassword(professional.email, token);

    return { success: true };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ success: true }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(input.token)
      .digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        professional: {
          select: {
            id: true,
            email: true,
            accessStatus: true,
          },
        },
      },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      effectiveAccessStatus(resetToken.professional.accessStatus) === 'DECLINED'
    ) {
      throw new BadRequestException({
        code: RESET_TOKEN_INVALID_CODE,
        message:
          'El enlace de recuperación es inválido, ya fue usado o expiró.',
      });
    }

    // Hash de la nueva contraseña
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Transacción interactiva: primero marcar token como usado (con validación),
    // luego actualizar contraseña. Si el token ya fue usado, fallar antes de tocar la contraseña.
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const tokenUpdateResult = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      // Si count es 0, el token ya fue usado o expiró en otra petición concurrente
      if (tokenUpdateResult.count === 0) {
        throw new BadRequestException({
          code: RESET_TOKEN_INVALID_CODE,
          message:
            'El enlace de recuperación es inválido, ya fue usado o expiró.',
        });
      }

      // Solo si el token se marcó correctamente, actualizar la contraseña
      await tx.professional.update({
        where: { id: resetToken.professionalId },
        data: { passwordHash },
      });
    });

    // Enviar correo de confirmación fuera de la transacción
    await this.mailService.sendPasswordChanged(resetToken.professional.email);

    return { success: true };
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
