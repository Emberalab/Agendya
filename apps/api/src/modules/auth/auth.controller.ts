import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Professional } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService, type GoogleUser } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: Professional) {
    return {
      id: user.id,
      email: user.email,
      businessName: user.businessName,
      slug: user.slug,
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const authResponse = await this.authService.googleLogin(
      req.user as GoogleUser,
    );

    // Redirect to frontend with token. Trim any trailing slash from WEB_URL so a
    // value like "http://localhost:5173/" does not produce a "//auth/callback"
    // path that the frontend router fails to match.
    const webUrl = (process.env.WEB_URL ?? 'http://localhost:5173').replace(
      /\/+$/,
      '',
    );
    const redirectUrl = `${webUrl}/auth/callback?token=${authResponse.accessToken}`;
    res.redirect(redirectUrl);
  }
}
