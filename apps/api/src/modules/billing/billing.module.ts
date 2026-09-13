import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { WompiWebhookController } from './wompi-webhook.controller';
import { WompiClient } from './wompi.client';

@Module({
  controllers: [BillingController, WompiWebhookController],
  providers: [BillingService, WompiClient],
})
export class BillingModule {}
