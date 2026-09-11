import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import type { Professional } from '@prisma/client';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  /**
   * Server-Sent Events stream of real-time events for the authenticated
   * professional.
   *
   * Auth reuses the app's only auth mechanism: the same `JwtAuthGuard` /
   * `Authorization: Bearer` header as every other protected route (the web
   * client opens this with `fetch`, not `EventSource`, so it can send the
   * header). The recipient scope is `user.id` from the validated token — the
   * client never supplies a professional id or channel name, so it cannot
   * receive another professional's events.
   */
  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  stream(@CurrentUser() user: Professional): Observable<MessageEvent> {
    return this.realtime.subscribe(user.id);
  }
}
