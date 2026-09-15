import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  auditLogListQuerySchema,
  type AuditLogListQuery,
} from '@agendya/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { AuditLogService } from './audit-log.service';

/** View-only for any authenticated internal role — no mutation exists here. */
@Controller('backoffice/audit-log')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermission('VIEW')
  list(
    @Query(new ZodValidationPipe(auditLogListQuerySchema))
    query: AuditLogListQuery,
  ) {
    return this.auditLogService.list(query);
  }
}
