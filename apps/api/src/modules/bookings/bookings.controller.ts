import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import { agendaQuerySchema, type AgendaQuery } from '@ronda/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  listAgenda(
    @CurrentUser() user: Professional,
    @Query(new ZodValidationPipe(agendaQuerySchema)) query: AgendaQuery,
  ) {
    return this.bookingsService.listAgenda(user.id, query.from, query.to);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.bookingsService.cancelByProfessional(user.id, id);
  }
}
