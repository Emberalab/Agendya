import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  checkSlugQuerySchema,
  updateProfileSchema,
  type CheckSlugQuery,
  type UpdateProfileInput,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedAccessGuard } from '../auth/guards/approved-access.guard';
import { ProfessionalsService } from './professionals.service';
import { ActivityService } from '../activity/activity.service';

@Controller('professionals')
@UseGuards(JwtAuthGuard, ApprovedAccessGuard)
export class ProfessionalsController {
  constructor(
    private readonly professionalsService: ProfessionalsService,
    private readonly activity: ActivityService,
  ) {}

  /**
   * The dashboard loads this on every visit, so it doubles as the (at most
   * once a day) "the professional opened Agendya" signal for the Backoffice
   * activity panel.
   */
  @Get('me')
  async getMe(@CurrentUser() user: Professional) {
    await this.activity.recordDailyVisit(user);
    return this.professionalsService.getProfile(user.id);
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
