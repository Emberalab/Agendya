import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GoogleOAuthStateGuard } from './google-oauth-state.guard';
import { OAUTH_STATE_COOKIE } from './oauth-state.constants';

function contextFor(query: Record<string, unknown>, cookieHeader?: string) {
  const clearCookie = jest.fn();
  const request = {
    headers: { cookie: cookieHeader },
    query,
  };
  const response = { clearCookie };
  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext,
    clearCookie,
  };
}

// Regression tests for the OAuth login-CSRF finding: without validating
// `state`, an attacker could start their own Google OAuth flow and trick a
// victim's browser into completing it (see GoogleAuthGuard for the full
// writeup).
describe('GoogleOAuthStateGuard', () => {
  const guard = new GoogleOAuthStateGuard();

  it('allows the request when the query state matches the cookie', () => {
    const { context, clearCookie } = contextFor(
      { state: 'abc123' },
      `${OAUTH_STATE_COOKIE}=abc123`,
    );
    expect(guard.canActivate(context)).toBe(true);
    expect(clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, { path: '/' });
  });

  it('rejects a mismatched state (forged/replayed callback)', () => {
    const { context } = contextFor(
      { state: 'attacker-controlled' },
      `${OAUTH_STATE_COOKIE}=abc123`,
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects when there is no state cookie at all', () => {
    const { context } = contextFor({ state: 'abc123' }, undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects when the query is missing a state value', () => {
    const { context } = contextFor({}, `${OAUTH_STATE_COOKIE}=abc123`);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
