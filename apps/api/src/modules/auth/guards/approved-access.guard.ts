import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';
import { effectiveAccessStatus } from '../professional-allowlist';

/**
 * Use after JwtAuthGuard. Blocks PENDING (and DECLINED) from dashboard APIs.
 * `/auth/me` must stay JwtAuthGuard-only so the waiting page can load.
 */
@Injectable()
export class ApprovedAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: Professional }>();
    const user = request.user;

    if (!user || effectiveAccessStatus(user.accessStatus) !== 'APPROVED') {
      throw new ForbiddenException({
        code: 'ACCESS_PENDING',
        message: 'Tu cuenta aún no tiene acceso al panel.',
      });
    }

    return true;
  }
}
