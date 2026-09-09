import { Global, Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

/**
 * `@Global` so `RealtimeService` can be injected by feature services (e.g.
 * `BookingsService`) without every module re-importing it — same pattern as
 * `DatabaseModule`. The `JwtAuthGuard` used by the controller relies on the
 * passport strategy that `AuthModule` registers process-wide, so no import of
 * `AuthModule` is needed here (`BookingsController` guards the same way).
 */
@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
