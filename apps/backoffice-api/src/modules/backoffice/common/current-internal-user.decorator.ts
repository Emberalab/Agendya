import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { InternalUser } from '@prisma/client';

export const CurrentInternalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): InternalUser => {
    const request = ctx.switchToHttp().getRequest<{ user: InternalUser }>();
    return request.user;
  },
);
