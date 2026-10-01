import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service';

/**
 * `@Global` so any feature service can record product activity without each
 * module re-importing this one — same pattern as `DatabaseModule` and
 * `RealtimeModule`. Write-only here: the timeline is read by
 * apps/backoffice-api, never exposed through this (professional-facing) API.
 */
@Global()
@Module({
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
