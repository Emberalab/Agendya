import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { WompiWebhookController } from './wompi-webhook.controller';
import { WompiClient } from './wompi.client';
import { PlanExpiryScheduler } from './plan-expiry.scheduler';
import { MailService } from '../../infra/mail/mail.service';

@Module({
  controllers: [BillingController, WompiWebhookController],
  providers: [BillingService, WompiClient, PlanExpiryScheduler, MailService],
})
export class BillingModule {}
