import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { AppointmentsService } from './appointments.service';

@Controller('backoffice/appointments')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(':id')
  @RequirePermission('VIEW')
  investigate(@Param('id') id: string) {
    return this.appointmentsService.investigate(id);
  }
}
