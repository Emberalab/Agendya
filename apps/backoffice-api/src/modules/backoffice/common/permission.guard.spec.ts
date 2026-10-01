import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { InternalUser } from '@prisma/client';
import { PermissionGuard } from './permission.guard';
import { PERMISSION_KEY } from './require-permission.decorator';

function makeContext(user?: Pick<InternalUser, 'role'>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  it('allows a route with no @RequirePermission for any authenticated user', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);
    expect(guard.canActivate(makeContext({ role: 'READ_ONLY' }))).toBe(true);
  });

  it('rejects a role missing the required permission', () => {
    const reflector = {
      getAllAndOverride: () => 'MANAGE_INTERNAL_USERS',
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);
    expect(() => guard.canActivate(makeContext({ role: 'SUPPORT' }))).toThrow();
  });

  it('allows a role that has the required permission', () => {
    const reflector = {
      getAllAndOverride: () => 'MUTATE_TICKETS',
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);
    expect(guard.canActivate(makeContext({ role: 'SUPPORT' }))).toBe(true);
  });

  it('rejects when there is no authenticated user at all', () => {
    const reflector = {
      getAllAndOverride: () => 'VIEW',
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow();
  });

  it('checks both the handler and the controller class for @RequirePermission', () => {
    // InternalUsersController applies @RequirePermission on the class, not
    // per-method — reading only context.getHandler() (the pre-fix code)
    // missed it entirely and silently let any role through.
    const getAllAndOverride = jest
      .fn()
      .mockReturnValue('MANAGE_INTERNAL_USERS');
    const reflector = { getAllAndOverride } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);
    const context = makeContext({ role: 'SUPPORT' });

    expect(() => guard.canActivate(context)).toThrow();
    expect(getAllAndOverride).toHaveBeenCalledWith(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
