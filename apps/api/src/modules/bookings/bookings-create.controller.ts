import { Body, Controller, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createBookingSchema, type CreateBookingInput } from '@agendya/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BookingsService } from './bookings.service';

@Controller('public/professionals')
export class BookingsCreateController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post(':slug/bookings')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(createBookingSchema)) dto: CreateBookingInput,
  ) {
    return this.bookingsService.createPublicBooking(slug, dto);
  }
}
