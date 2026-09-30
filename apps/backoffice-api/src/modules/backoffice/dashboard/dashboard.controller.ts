import { Controller, Get, UseGuards } from '@nestjs/common';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { BackofficeDashboardService } from './dashboard.service';

@Controller('backoffice/dashboard')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
export class BackofficeDashboardController {
  constructor(private readonly dashboardService: BackofficeDashboardService) {}

  @Get()
  @RequirePermission('VIEW')
  summary() {
    return this.dashboardService.summary();
  }
}
