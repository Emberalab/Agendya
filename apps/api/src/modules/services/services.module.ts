import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
