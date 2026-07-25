import { Module } from '@nestjs/common';
import { ProfessionalsPublicController } from './professionals-public.controller';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';

@Module({
  controllers: [ProfessionalsController, ProfessionalsPublicController],
  providers: [ProfessionalsService],
})
export class ProfessionalsModule {}
