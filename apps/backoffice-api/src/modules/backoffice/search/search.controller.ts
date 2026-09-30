import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  backofficeSearchQuerySchema,
  type BackofficeSearchQuery,
} from '@agendya/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { BackofficeSearchService } from './search.service';

@Controller('backoffice/search')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
export class BackofficeSearchController {
  constructor(private readonly searchService: BackofficeSearchService) {}

  @Get()
  @RequirePermission('VIEW')
  search(
    @Query(new ZodValidationPipe(backofficeSearchQuerySchema))
    query: BackofficeSearchQuery,
  ) {
    return this.searchService.search(query.q);
  }
}
