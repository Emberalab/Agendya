import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { InternalUser } from '@prisma/client';
import {
  activityListQuerySchema,
  trialListQuerySchema,
  type ActivityListQuery,
  type TrialListQuery,
} from '@agendya/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { CurrentInternalUser } from '../common/current-internal-user.decorator';
import { ProfessionalActivityService } from './professional-activity.service';

/**
 * Read-only product activity of one professional. Internal-token only
 * (`InternalJwtAuthGuard` rejects professional-facing tokens by audience);
 * there is no professional-facing route to this data in apps/api.
 */
@Controller('backoffice/professionals/:id/activity')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
@RequirePermission('VIEW')
export class ProfessionalActivityController {
  constructor(private readonly activity: ProfessionalActivityService) {}

  @Get()
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(activityListQuerySchema))
    query: ActivityListQuery,
  ) {
    return this.activity.list(id, query);
  }

  /** Audit-logged, like the 360° view: one row per panel open. */
  @Get('summary')
  summary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentInternalUser() actor: InternalUser,
  ) {
    return this.activity.summary(id, actor.id);
  }
}

/** Accounts that have (or had) a full-access trial. */
@Controller('backoffice/trials')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
@RequirePermission('VIEW')
export class TrialAccountsController {
  constructor(private readonly activity: ProfessionalActivityService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(trialListQuerySchema)) query: TrialListQuery,
  ) {
    return this.activity.listTrials(query);
  }
}
