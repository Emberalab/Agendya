import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  createScheduleExceptionSchema,
  setWorkingHoursSchema,
  type CreateScheduleExceptionInput,
  type SetWorkingHoursInput,
} from '@ronda/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('working-hours')
  getWorkingHours(@CurrentUser() user: Professional) {
    return this.schedulesService.getWorkingHours(user.id);
  }

  @Put('working-hours')
  setWorkingHours(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(setWorkingHoursSchema))
    dto: SetWorkingHoursInput,
  ) {
    return this.schedulesService.setWorkingHours(user.id, dto);
  }

  @Get('exceptions')
  listExceptions(@CurrentUser() user: Professional) {
    return this.schedulesService.listExceptions(user.id);
  }

  @Post('exceptions')
  createException(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(createScheduleExceptionSchema))
    dto: CreateScheduleExceptionInput,
  ) {
    return this.schedulesService.createException(user.id, dto);
  }

  @Delete('exceptions/:id')
  deleteException(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.schedulesService.deleteException(user.id, id);
  }
}
