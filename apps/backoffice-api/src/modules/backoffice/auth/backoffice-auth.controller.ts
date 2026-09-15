import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { InternalUser } from '@prisma/client';
import {
  backofficeLoginSchema,
  type BackofficeLoginInput,
} from '@agendya/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentInternalUser } from '../common/current-internal-user.decorator';
import { InternalJwtAuthGuard } from './internal-jwt-auth.guard';
import { BackofficeAuthService } from './backoffice-auth.service';

@Controller('backoffice/auth')
export class BackofficeAuthController {
  constructor(private readonly authService: BackofficeAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(
    @Body(new ZodValidationPipe(backofficeLoginSchema))
    dto: BackofficeLoginInput,
  ) {
    return this.authService.login(dto);
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
