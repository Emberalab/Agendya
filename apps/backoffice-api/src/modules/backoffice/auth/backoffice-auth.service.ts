import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  BACKOFFICE_RESET_TOKEN_INVALID_CODE,
  type BackofficeAuthResponse,
  type BackofficeForgotPasswordInput,
  type BackofficeLoginInput,
  type BackofficeResetPasswordInput,
} from '@agendya/types';
import type { InternalUser } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../../infra/mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BACKOFFICE_JWT_AUDIENCE } from './backoffice-jwt.constants';
import {
  BackofficeGoogleAuthError,
  type BackofficeGoogleProfile,
} from './google-oauth.constants';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class BackofficeAuthService {
  private readonly logger = new Logger(BackofficeAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async login(input: BackofficeLoginInput): Promise<BackofficeAuthResponse> {
    const internalUser = await this.prisma.internalUser.findUnique({
      where: { email: input.email },
    });

    if (!internalUser || !internalUser.isActive) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      internalUser.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this.buildAuthResponse(internalUser);
  }

  /**
   * Always resolves the same way, whether or not the email belongs to an
   * active staff account, so the endpoint can't be used to enumerate staff.
   */
  async forgotPassword(
    input: BackofficeForgotPasswordInput,
  ): Promise<{ success: true }> {
    const internalUser = await this.prisma.internalUser.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, name: true, isActive: true },
    });
    if (!internalUser || !internalUser.isActive) {
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      // Only the newest link works.
      this.prisma.internalPasswordResetToken.updateMany({
        where: { internalUserId: internalUser.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.internalPasswordResetToken.create({
        data: {
          internalUserId: internalUser.id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    await this.mailService.sendPasswordReset(
      internalUser.email,
      internalUser.name,
      token,
    );
    return { success: true };
  }

  async resetPassword(
    input: BackofficeResetPasswordInput,
  ): Promise<{ success: true }> {
    const invalid = () =>
      new BadRequestException({
        code: BACKOFFICE_RESET_TOKEN_INVALID_CODE,
        message:
          'El enlace de recuperación es inválido, ya fue usado o expiró. Solicita uno nuevo.',
      });

    const resetToken = await this.prisma.internalPasswordResetToken.findUnique({
      where: { tokenHash: hashResetToken(input.token) },
      include: {
        internalUser: {
          select: { id: true, email: true, name: true, isActive: true },
        },
      },
    });
    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      !resetToken.internalUser.isActive
    ) {
      throw invalid();
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      // Claim the token first; a concurrent request that already used it
      // makes this a no-op and the password is never touched.
      const claimed = await tx.internalPasswordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw invalid();

      await tx.internalUser.update({
        where: { id: resetToken.internalUserId },
        // Ends every session issued before now (see InternalJwtStrategy).
        data: { passwordHash, passwordChangedAt: now },
      });
    });

    await this.auditLog.record(
      resetToken.internalUserId,
      'INTERNAL_USER_PASSWORD_RESET',
      'InternalUser',
      resetToken.internalUserId,
      { method: 'email_link' },
    );
    await this.mailService.sendPasswordChanged(
      resetToken.internalUser.email,
      resetToken.internalUser.name,
    );
    return { success: true };
  }

  /**
   * Google sign-in never creates a staff account (there is no
   * self-registration). It signs in an existing, active InternalUser:
   *  1. already linked to this Google account (`googleId`), or
   *  2. not yet linked and with the same email — Google must have verified
   *     that email, and it must be in GOOGLE_ALLOWED_DOMAINS when set. The
   *     link is stored and audited.
   * An email that's already linked to a *different* Google account is
   * refused rather than silently re-linked.
   */
  async googleLogin(
    profile: BackofficeGoogleProfile,
  ): Promise<BackofficeAuthResponse> {
    const allowedDomains =
      this.configService.get<string[]>('google.allowedDomains') ?? [];
    const domain = profile.email.split('@')[1] ?? '';
    if (
      !profile.emailVerified ||
      !profile.email ||
      (allowedDomains.length > 0 && !allowedDomains.includes(domain))
    ) {
      throw new BackofficeGoogleAuthError('google_not_allowed');
    }

    const linked = await this.prisma.internalUser.findUnique({
      where: { googleId: profile.googleId },
    });
    if (linked) {
      if (!linked.isActive) {
        throw new BackofficeGoogleAuthError('google_no_account');
      }
      return this.buildAuthResponse(linked);
    }

    const byEmail = await this.prisma.internalUser.findUnique({
      where: { email: profile.email },
    });
    if (!byEmail || !byEmail.isActive) {
      throw new BackofficeGoogleAuthError('google_no_account');
    }
    if (byEmail.googleId && byEmail.googleId !== profile.googleId) {
      this.logger.warn(
        `Google sign-in refused for staff ${byEmail.id}: email already linked to another Google account.`,
      );
      throw new BackofficeGoogleAuthError('google_not_allowed');
    }

    const updated = await this.prisma.internalUser.update({
      where: { id: byEmail.id },
      data: { googleId: profile.googleId },
    });
    await this.auditLog.record(
      updated.id,
      'INTERNAL_USER_GOOGLE_LINKED',
      'InternalUser',
      updated.id,
    );
    return this.buildAuthResponse(updated);
  }

  buildAuthResponse(internalUser: InternalUser): BackofficeAuthResponse {
    const accessToken = this.jwtService.sign(
      { sub: internalUser.id, email: internalUser.email },
      { audience: BACKOFFICE_JWT_AUDIENCE },
    );

    return {
      accessToken,
      user: {
        id: internalUser.id,
        email: internalUser.email,
        name: internalUser.name,
        role: internalUser.role,
        isActive: internalUser.isActive,
        createdAt: internalUser.createdAt.toISOString(),
        updatedAt: internalUser.updatedAt.toISOString(),
      },
    };
  }
}
