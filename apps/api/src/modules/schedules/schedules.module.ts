import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  controllers: [SchedulesController, AvailabilityController],
  providers: [SchedulesService, AvailabilityService],
  exports: [AvailabilityService],
})
export class SchedulesModule {}
