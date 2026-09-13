import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Professional } from '@prisma/client';
import {
  createBillingCheckoutSchema,
  syncBillingTransactionSchema,
  type CreateBillingCheckoutInput,
  type SyncBillingTransactionInput,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createCheckout(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(createBillingCheckoutSchema))
    input: CreateBillingCheckoutInput,
  ) {
    return this.billingService.createCheckout(user, input);
  }

  @Post('sync')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  syncTransaction(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(syncBillingTransactionSchema))
    input: SyncBillingTransactionInput,
  ) {
    return this.billingService.syncTransaction(user.id, input);
  }
}
