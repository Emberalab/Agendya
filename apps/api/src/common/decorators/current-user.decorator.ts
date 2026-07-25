import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Professional } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Professional => {
    const request = ctx.switchToHttp().getRequest<{ user: Professional }>();
    return request.user;
  },
);
