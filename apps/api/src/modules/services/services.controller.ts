import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(@CurrentUser() user: Professional) {
    return this.servicesService.findAllForProfessional(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(createServiceSchema)) dto: CreateServiceInput,
  ) {
    return this.servicesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: Professional,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) dto: UpdateServiceInput,
  ) {
    return this.servicesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.servicesService.softDelete(user.id, id);
  }
}
