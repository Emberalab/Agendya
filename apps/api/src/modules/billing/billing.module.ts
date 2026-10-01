import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { WompiWebhookController } from './wompi-webhook.controller';
import { WompiClient } from './wompi.client';
import { PlanExpiryScheduler } from './plan-expiry.scheduler';
import { TrialExpiryScheduler } from './trial-expiry.scheduler';
import { MailService } from '../../infra/mail/mail.service';

@Module({
  controllers: [BillingController, WompiWebhookController],
  providers: [
    BillingService,
    WompiClient,
    PlanExpiryScheduler,
    TrialExpiryScheduler,
    MailService,
  ],
})
export class BillingModule {}
