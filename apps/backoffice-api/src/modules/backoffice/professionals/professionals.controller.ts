import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { InternalUser } from '@prisma/client';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { CurrentInternalUser } from '../common/current-internal-user.decorator';
import { BackofficeProfessionalsService } from './professionals.service';

@Controller('backoffice/professionals')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
export class BackofficeProfessionalsController {
  constructor(
    private readonly professionalsService: BackofficeProfessionalsService,
  ) {}

  @Get(':id')
  @RequirePermission('VIEW')
  get360(@Param('id') id: string, @CurrentInternalUser() actor: InternalUser) {
    return this.professionalsService.get360(id, actor.id);
  }
}
