import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { AuthResponse, LoginInput, RegisterInput } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { ensureUniqueSlug, slugify } from '../../common/utils/slug.util';

const SALT_ROUNDS = 10;

interface ProfessionalIdentity {
  id: string;
  email: string;
  businessName: string;
  slug: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
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
      },
    });

    return this.buildAuthResponse(professional);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
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

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
  }): Promise<AuthResponse> {
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
        const slug = await ensureUniqueSlug(
          this.prisma,
          slugify(businessName),
        );

        professional = await this.prisma.professional.create({
          data: {
            email: googleUser.email,
            googleId: googleUser.googleId,
            businessName,
            slug,
            photoUrl: googleUser.photoUrl,
          },
        });
      }
    }

    return this.buildAuthResponse(professional);
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
      },
    };
  }
}
