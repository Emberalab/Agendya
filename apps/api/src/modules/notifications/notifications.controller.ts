import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import {
  notificationListQuerySchema,
  type NotificationListQuery,
} from '@agendya/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

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
