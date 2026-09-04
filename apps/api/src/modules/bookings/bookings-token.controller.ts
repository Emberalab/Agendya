import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  rescheduleBookingSchema,
  updateBookingSchema,
  type RescheduleBookingInput,
  type UpdateBookingInput,
} from '@agendya/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BookingsService } from './bookings.service';

@Controller('public/bookings')
export class BookingsTokenController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getByToken(@Param('token') token: string) {
    return this.bookingsService.getPublicBookingByToken(token);
  }

  @Patch(':token')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  update(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(updateBookingSchema)) dto: UpdateBookingInput,
  ) {
    return this.bookingsService.updatePublicBooking(token, dto);
  }

  @Post(':token/cancel')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  cancel(@Param('token') token: string) {
    return this.bookingsService.cancelPublicBooking(token);
  }

  @Post(':token/reschedule')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reschedule(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(rescheduleBookingSchema))
    dto: RescheduleBookingInput,
  ) {
    return this.bookingsService.reschedulePublicBooking(token, dto);
  }
}
