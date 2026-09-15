import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { InternalUser } from '@prisma/client';
import { PERMISSION_KEY } from './require-permission.decorator';
import { roleHasPermission, type Permission } from './permissions';

/**
 * Reads the permission a route requires (`@RequirePermission(...)`) and
 * checks it against the authenticated internal user's DB-backed role. A
 * route with no `@RequirePermission` decorator only requires a valid,
 * active internal session (enforced by `InternalJwtAuthGuard`) — use this
 * guard for anything that mutates or otherwise needs a specific privilege.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getAllAndOverride, not get(..., context.getHandler()): a
    // `@RequirePermission` applied at the controller-class level (as
    // InternalUsersController does) sets metadata on the class, not on each
    // handler method — reading only the handler silently found nothing and
    // let any authenticated internal user through regardless of role.
    const required = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: InternalUser }>();
    const user = request.user;

    if (!user || !roleHasPermission(user.role, required)) {
      throw new ForbiddenException(
        'Tu rol no tiene permiso para realizar esta acción.',
      );
    }

    return true;
  }
}
