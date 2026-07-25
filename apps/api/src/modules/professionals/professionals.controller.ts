import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  checkSlugQuerySchema,
  updateProfileSchema,
  type CheckSlugQuery,
  type UpdateProfileInput,
} from '@ronda/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
@UseGuards(JwtAuthGuard)
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get('me')
  getMe(@CurrentUser() user: Professional) {
    return this.professionalsService.toProfile(user);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileInput,
  ) {
    return this.professionalsService.updateProfile(user.id, dto);
  }

  @Get('check-slug')
  async checkSlug(
    @CurrentUser() user: Professional,
    @Query(new ZodValidationPipe(checkSlugQuerySchema)) query: CheckSlugQuery,
  ) {
    const available = await this.professionalsService.isSlugAvailable(
      query.slug,
      user.id,
    );
    return { available };
  }
}
