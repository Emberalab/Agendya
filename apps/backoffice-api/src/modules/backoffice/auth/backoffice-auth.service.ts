import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type {
  BackofficeAuthResponse,
  BackofficeLoginInput,
} from '@agendya/types';
import type { InternalUser } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BACKOFFICE_JWT_AUDIENCE } from './backoffice-jwt.constants';

@Injectable()
export class BackofficeAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
