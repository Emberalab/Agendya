import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  addSupportMessageSchema,
  createSupportTicketSchema,
  supportTicketListQuerySchema,
  type AddSupportMessageInput,
  type CreateSupportTicketInput,
  type SupportTicketListQuery,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportService } from './support.service';

@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  list(
    @CurrentUser() user: Professional,
    @Query(new ZodValidationPipe(supportTicketListQuerySchema))
    query: SupportTicketListQuery,
  ) {
    return this.supportService.list(user.id, query);
  }

  @Get(':id')
  getOne(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.supportService.getOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(createSupportTicketSchema))
    input: CreateSupportTicketInput,
  ) {
    return this.supportService.create(user.id, input);
  }

  @Post(':id/messages')
  addMessage(
    @CurrentUser() user: Professional,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addSupportMessageSchema))
    input: AddSupportMessageInput,
  ) {
    return this.supportService.addMessage(user.id, id, input);
  }
}
