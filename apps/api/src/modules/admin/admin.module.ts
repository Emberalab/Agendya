import { Module } from '@nestjs/common';
import { MailService } from '../../infra/mail/mail.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, MailService],
})
export class AdminModule {}
