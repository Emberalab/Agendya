import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { InternalUser } from '@prisma/client';
import {
  addTicketMessageSchema,
  assignTicketSchema,
  createTicketSchema,
  ticketListQuerySchema,
  updateTicketPrioritySchema,
  updateTicketStatusSchema,
  type AddTicketMessageInput,
  type AssignTicketInput,
  type CreateTicketInput,
  type TicketListQuery,
  type UpdateTicketPriorityInput,
  type UpdateTicketStatusInput,
} from '@agendya/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { InternalJwtAuthGuard } from '../auth/internal-jwt-auth.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/require-permission.decorator';
import { CurrentInternalUser } from '../common/current-internal-user.decorator';
import { TicketsService } from './tickets.service';

@Controller('backoffice/tickets')
@UseGuards(InternalJwtAuthGuard, PermissionGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @RequirePermission('VIEW')
  list(
    @Query(new ZodValidationPipe(ticketListQuerySchema)) query: TicketListQuery,
  ) {
    return this.ticketsService.list(query);
  }

  @Get(':id')
  @RequirePermission('VIEW')
  getOne(@Param('id') id: string) {
    return this.ticketsService.getOne(id);
  }

  @Post()
  @RequirePermission('MUTATE_TICKETS')
  create(
    @Body(new ZodValidationPipe(createTicketSchema)) input: CreateTicketInput,
    @CurrentInternalUser() actor: InternalUser,
  ) {
    return this.ticketsService.create(input, actor);
  }

  @Post(':id/messages')
  @RequirePermission('MUTATE_TICKETS')
  addMessage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addTicketMessageSchema))
    input: AddTicketMessageInput,
    @CurrentInternalUser() actor: InternalUser,
  ) {
    return this.ticketsService.addMessage(id, input, actor);
  }

  @Patch(':id/status')
  @RequirePermission('MUTATE_TICKETS')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketStatusSchema))
    input: UpdateTicketStatusInput,
    @CurrentInternalUser() actor: InternalUser,
  ) {
    return this.ticketsService.updateStatus(id, input, actor);
  }

  @Patch(':id/priority')
  @RequirePermission('MUTATE_TICKETS')
  updatePriority(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketPrioritySchema))
    input: UpdateTicketPriorityInput,
    @CurrentInternalUser() actor: InternalUser,
  ) {
    return this.ticketsService.updatePriority(id, input, actor);
  }

  // Assignment permission is finer-grained than the guard can express
  // (SUPPORT may assign to self, ADMIN+ to anyone) — enforced in the
  // service, so this route only requires MUTATE_TICKETS at the guard level.
  @Patch(':id/assign')
  @RequirePermission('MUTATE_TICKETS')
  assign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignTicketSchema)) input: AssignTicketInput,
    @CurrentInternalUser() actor: InternalUser,
  ) {
    return this.ticketsService.assign(id, input, actor);
  }
}
