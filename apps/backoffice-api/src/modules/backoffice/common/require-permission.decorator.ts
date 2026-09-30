import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';

export const PERMISSION_KEY = 'backoffice:permission';

/** Use after `InternalJwtAuthGuard`. See {@link Permission} for the matrix. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);
