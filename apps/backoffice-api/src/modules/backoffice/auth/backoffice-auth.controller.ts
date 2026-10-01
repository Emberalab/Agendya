import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { InternalUser } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  backofficeForgotPasswordSchema,
  backofficeLoginSchema,
  backofficeResetPasswordSchema,
  type BackofficeForgotPasswordInput,
  type BackofficeLoginInput,
  type BackofficeResetPasswordInput,
} from '@agendya/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentInternalUser } from '../common/current-internal-user.decorator';
import { InternalJwtAuthGuard } from './internal-jwt-auth.guard';
import { BackofficeAuthService } from './backoffice-auth.service';
import { BackofficeGoogleAuthGuard } from './backoffice-google-auth.guard';
import { BackofficeOAuthStateGuard } from './backoffice-oauth-state.guard';
import { BackofficeGoogleCallbackFilter } from './backoffice-google-callback.filter';
import type { BackofficeGoogleProfile } from './google-oauth.constants';

@Controller('backoffice/auth')
export class BackofficeAuthController {
  constructor(
    private readonly authService: BackofficeAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(
    @Body(new ZodValidationPipe(backofficeLoginSchema))
    dto: BackofficeLoginInput,
  ) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(
    @Body(new ZodValidationPipe(backofficeForgotPasswordSchema))
    dto: BackofficeForgotPasswordInput,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(
    @Body(new ZodValidationPipe(backofficeResetPasswordSchema))
    dto: BackofficeResetPasswordInput,
  ) {
    return this.authService.resetPassword(dto);
  }

  @Get('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseFilters(BackofficeGoogleCallbackFilter)
  @UseGuards(BackofficeGoogleAuthGuard)
  google() {
    // The guard redirects to Google.
  }

  @Get('google/callback')
  @UseFilters(BackofficeGoogleCallbackFilter)
  @UseGuards(BackofficeOAuthStateGuard, BackofficeGoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.googleLogin(
      req.user as BackofficeGoogleProfile,
    );
    const webUrl =
      this.configService.get<string>('backofficeWebUrl') ??
      'http://localhost:5174';
    // Token in the URL fragment, never the query string: fragments aren't
    // sent to any server, logged by proxies, or leaked via Referer. Same
    // approach as apps/api's Google callback.
    res.redirect(`${webUrl}/backoffice/auth/callback#token=${accessToken}`);
  }

  @Get('me')
  @UseGuards(InternalJwtAuthGuard)
  me(@CurrentInternalUser() user: InternalUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
