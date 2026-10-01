import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import {
  BACKOFFICE_GOOGLE_STRATEGY,
  BACKOFFICE_OAUTH_STATE_COOKIE,
  BACKOFFICE_OAUTH_STATE_COOKIE_MAX_AGE_MS,
  BackofficeGoogleAuthError,
  isGoogleConfigured,
} from './google-oauth.constants';

/**
 * Starts (and, on the callback, completes) the Google redirect. Same
 * login-CSRF protection as apps/api's GoogleAuthGuard: a random `state` is
 * stored in a short-lived httpOnly cookie and checked on the callback by
 * `BackofficeOAuthStateGuard`. Refuses to start when Google isn't
 * configured, which the callback filter turns into `?error=google_unavailable`.
 */
@Injectable()
export class BackofficeGoogleAuthGuard extends AuthGuard(
  BACKOFFICE_GOOGLE_STRATEGY,
) {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const configured = isGoogleConfigured({
      clientId: this.configService.get<string>('google.clientId'),
      clientSecret: this.configService.get<string>('google.clientSecret'),
    });
    if (!configured) {
      throw new BackofficeGoogleAuthError('google_unavailable');
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext): {
    state?: string;
    prompt?: string;
  } {
    const request = context.switchToHttp().getRequest<Request>();
    // Also runs on the callback; minting a new state there would overwrite
    // the cookie the callback still has to compare against.
    if (typeof request.query.code === 'string') {
      return {};
    }

    const response = context.switchToHttp().getResponse<Response>();
    const state = randomBytes(24).toString('hex');
    response.cookie(BACKOFFICE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.protocol === 'https',
      path: '/backoffice/auth',
      maxAge: BACKOFFICE_OAUTH_STATE_COOKIE_MAX_AGE_MS,
    });
    // Always show the account chooser: staff often have a personal and a
    // work Google account in the same browser.
    return { state, prompt: 'select_account' };
  }

  // Passport reports a cancelled consent screen or a token-exchange failure
  // as an error/falsy user; normalise both into one redirectable error.
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    if (err instanceof BackofficeGoogleAuthError) throw err;
    if (err || !user) throw new BackofficeGoogleAuthError('google_failed');
    return user;
  }
}
