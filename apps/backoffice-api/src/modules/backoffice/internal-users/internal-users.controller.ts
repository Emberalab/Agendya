import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { InternalUser as InternalUserRow } from '@prisma/client';
import {
  createInternalUserSchema,
  updateInternalUserRoleSchema,
  updateInternalUserStatusSchema,
  type CreateInternalUserInput,
  type UpdateInternalUserRoleInput,
  type UpdateInternalUserStatusInput,
} from '@agendya/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { CurrentInternalUser } from '../common/current-internal-user.decorator';
import { InternalUsersService } from './internal-users.service';

/** Every route here requires MANAGE_INTERNAL_USERS — SUPER_ADMIN only. */
@Controller('backoffice/internal-users')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
@RequirePermission('MANAGE_INTERNAL_USERS')
export class InternalUsersController {
  constructor(private readonly internalUsersService: InternalUsersService) {}

  @Get()
  list() {
    return this.internalUsersService.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createInternalUserSchema))
    input: CreateInternalUserInput,
    @CurrentInternalUser() actor: InternalUserRow,
  ) {
    return this.internalUsersService.create(input, actor.id);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInternalUserRoleSchema))
    input: UpdateInternalUserRoleInput,
    @CurrentInternalUser() actor: InternalUserRow,
  ) {
    return this.internalUsersService.updateRole(id, input, actor.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInternalUserStatusSchema))
    input: UpdateInternalUserStatusInput,
    @CurrentInternalUser() actor: InternalUserRow,
  ) {
    return this.internalUsersService.updateStatus(id, input, actor.id);
  }
}
