import { Module } from '@nestjs/common';
import { MailService } from '../../infra/mail/mail.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TrialService } from './trial.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, TrialService, MailService],
})
export class AdminModule {}
