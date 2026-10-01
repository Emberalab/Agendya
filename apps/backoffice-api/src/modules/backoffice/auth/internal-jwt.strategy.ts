import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { BACKOFFICE_JWT_AUDIENCE } from './backoffice-jwt.constants';

export interface InternalJwtPayload {
  sub: string;
  email: string;
  /** Issued-at, seconds since epoch (set by jsonwebtoken). */
  iat?: number;
}

/**
 * Separate passport strategy (name: `internal-jwt`) from the customer-facing
 * `jwt` strategy. Tokens are signed with `audience: BACKOFFICE_JWT_AUDIENCE`
 * (see `BackofficeAuthService.buildAuthResponse`); passport-jwt rejects any
 * token missing that audience claim before `validate()` even runs, so a
 * professional's session token can never authenticate here and vice versa.
 */
@Injectable()
export class InternalJwtStrategy extends PassportStrategy(
  Strategy,
  'internal-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
      audience: BACKOFFICE_JWT_AUDIENCE,
    });
  }

  async validate(payload: InternalJwtPayload) {
    const internalUser = await this.prisma.internalUser.findUnique({
      where: { id: payload.sub },
    });

    if (!internalUser || !internalUser.isActive) {
      throw new UnauthorizedException();
    }

    // A password reset revokes every token issued before it. Compared at
    // whole-second precision (JWT `iat` granularity), so a token issued in
    // the same second as the reset still works.
    if (
      internalUser.passwordChangedAt &&
      (payload.iat ?? 0) <
        Math.floor(internalUser.passwordChangedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException();
    }

    return internalUser;
  }
}
