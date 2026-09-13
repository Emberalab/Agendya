import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';

@Controller('webhooks')
export class WompiWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('wompi')
  @SkipThrottle()
  @HttpCode(200)
  handleWompiEvent(
    @Body() body: unknown,
    @Headers('x-event-checksum') checksumHeader?: string,
  ) {
    return this.billingService.handleWompiEvent(
      body && typeof body === 'object' ? body : {},
      checksumHeader,
    );
  }
}
