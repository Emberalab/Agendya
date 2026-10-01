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
import type { Professional } from '@prisma/client';
import {
  agendaQuerySchema,
  createManualBookingSchema,
  rescheduleBookingSchema,
  type AgendaQuery,
  type CreateManualBookingInput,
  type RescheduleBookingInput,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedAccessGuard } from '../auth/guards/approved-access.guard';
import { BookingsService } from './bookings.service';

@Controller('bookings')
@UseGuards(JwtAuthGuard, ApprovedAccessGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  listAgenda(
    @CurrentUser() user: Professional,
    @Query(new ZodValidationPipe(agendaQuerySchema)) query: AgendaQuery,
  ) {
    return this.bookingsService.listAgenda(user.id, query.from, query.to);
  }

  @Post()
  createManualBooking(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(createManualBookingSchema))
    dto: CreateManualBookingInput,
  ) {
    return this.bookingsService.createManualBooking(user.id, dto);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.bookingsService.cancelByProfessional(user.id, id);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.bookingsService.completeByProfessional(user.id, id);
  }

  @Patch(':id/reschedule')
  reschedule(
    @CurrentUser() user: Professional,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rescheduleBookingSchema))
    dto: RescheduleBookingInput,
  ) {
    return this.bookingsService.rescheduleBooking(user.id, id, dto);
  }
}
