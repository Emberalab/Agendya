import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Professional } from '@prisma/client';

/** Use after JwtAuthGuard. Allows only `role === SUPER_ADMIN`. */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: Professional }>();
    const user = request.user;

    if (!user || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Esta función requiere privilegios de administrador.',
      );
    }

    return true;
  }
}
