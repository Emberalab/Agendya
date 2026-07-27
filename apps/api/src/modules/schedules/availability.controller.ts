import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { availabilityQuerySchema, type AvailabilityQuery } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AvailabilityService } from './availability.service';

@Controller('public/professionals')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':slug/availability')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getAvailability(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(availabilityQuerySchema))
    query: AvailabilityQuery,
  ) {
    const professional = await this.prisma.professional.findFirst({
      where: { slug, isActive: true },
    });
    if (!professional) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    // Parse comma-separated serviceIds
    const serviceIds = query.serviceIds.split(',').map(id => id.trim());

    const slots = await this.availabilityService.getAvailableSlots(
      professional.id,
      serviceIds,
      query.date,
    );
    return { slots };
  }
}
