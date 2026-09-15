import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  changeProfessionalPlanSchema,
  createAllowlistEntrySchema,
  updateAllowlistEntrySchema,
  updateRegistrationStatusSchema,
  type ChangeProfessionalPlanInput,
  type CreateAllowlistEntryInput,
  type UpdateAllowlistEntryInput,
  type UpdateRegistrationStatusInput,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedAccessGuard } from '../auth/guards/approved-access.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, ApprovedAccessGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('allowlist')
  listAllowlist() {
    return this.adminService.listAllowlist();
  }

  @Get('registrations')
  listRegistrations() {
    return this.adminService.listRegistrations();
  }

  @Patch('registrations/:email')
  updateRegistrationStatus(
    @Param('email') email: string,
    @Body(new ZodValidationPipe(updateRegistrationStatusSchema))
    input: UpdateRegistrationStatusInput,
  ) {
    return this.adminService.updateRegistrationStatus(email, input.status);
  }

  @Post('allowlist')
  createAllowlistEntry(
    @Body(new ZodValidationPipe(createAllowlistEntrySchema))
    input: CreateAllowlistEntryInput,
  ) {
    return this.adminService.createAllowlistEntry(input);
  }

  @Patch('allowlist/:email')
  updateAllowlistEntry(
    @Param('email') email: string,
    @Body(new ZodValidationPipe(updateAllowlistEntrySchema))
    input: UpdateAllowlistEntryInput,
    @CurrentUser() currentUser: Professional,
  ) {
    return this.adminService.updateAllowlistEntry(
      email,
      input,
      currentUser.email,
    );
  }

  @Delete('allowlist/:email')
  async deleteAllowlistEntry(
    @Param('email') email: string,
    @CurrentUser() currentUser: Professional,
  ): Promise<{ deleted: true }> {
    await this.adminService.deleteAllowlistEntry(email, currentUser.email);
    return { deleted: true };
  }

  @Get('professionals/:email')
  getProfessionalByEmail(@Param('email') email: string) {
    return this.adminService.getProfessionalByEmail(email);
  }

  @Patch('professionals/:email/plan')
  changeProfessionalPlan(
    @Param('email') email: string,
    @Body(new ZodValidationPipe(changeProfessionalPlanSchema))
    input: ChangeProfessionalPlanInput,
  ) {
    return this.adminService.changeProfessionalPlan(email, input.plan);
  }
}
