import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProfessionalsService } from './professionals.service';

@Controller('public/professionals')
export class ProfessionalsPublicController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get(':slug')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  findBySlug(@Param('slug') slug: string) {
    return this.professionalsService.findPublicBySlug(slug);
  }
}
