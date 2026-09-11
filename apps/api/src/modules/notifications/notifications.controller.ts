import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  notificationListQuerySchema,
  pushSubscribeInputSchema,
  pushUnsubscribeInputSchema,
  type NotificationListQuery,
  type PushSubscribeInput,
  type PushUnsubscribeInput,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly push: PushSubscriptionsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: Professional,
    @Query(new ZodValidationPipe(notificationListQuerySchema))
    query: NotificationListQuery,
  ) {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: Professional) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  /**
   * VAPID public key for `pushManager.subscribe()`. `null` when the server has
   * no keys configured — the dashboard hides the push toggle in that case.
   */
  @Get('push/public-key')
  pushPublicKey() {
    return { publicKey: this.push.publicKey };
  }

  /** Whether this professional has at least one device registered for push. */
  @Get('push/status')
  async pushStatus(@CurrentUser() user: Professional) {
    return { subscribed: await this.push.hasSubscription(user.id) };
  }

  @Post('push/subscribe')
  @HttpCode(204)
  async pushSubscribe(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(pushSubscribeInputSchema))
    body: PushSubscribeInput,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.push.subscribe(user.id, body, userAgent);
  }

  @Post('push/unsubscribe')
  @HttpCode(204)
  async pushUnsubscribe(
    @CurrentUser() user: Professional,
    @Body(new ZodValidationPipe(pushUnsubscribeInputSchema))
    body: PushUnsubscribeInput,
  ) {
    await this.push.unsubscribe(user.id, body.endpoint);
  }

  // Declared before `:id/read` — `read-all` is a distinct 2-segment path, so
  // there is no routing ambiguity, but keeping it first documents the intent.
  @Patch('read-all')
  markAllRead(@CurrentUser() user: Professional) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  // Literal `read` segment declared before `:id` so it wins the route match.
  @Delete('read')
  deleteAllRead(@CurrentUser() user: Professional) {
    return this.notifications.deleteAllRead(user.id);
  }

  @Delete(':id')
  deleteRead(@CurrentUser() user: Professional, @Param('id') id: string) {
    return this.notifications.deleteRead(user.id, id);
  }
}
