import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_COOKIE_MAX_AGE_MS,
} from './oauth-state.constants';

/**
 * Initiates the Google OAuth redirect. Generates a random per-request
 * `state` value, stores it in a short-lived httpOnly cookie, and forwards it
 * to Google as the `state` query param. `GoogleOAuthStateGuard` checks the
 * callback's `state` against this cookie — without it, an attacker could
 * start their own OAuth flow and trick a victim into completing it (login
 * CSRF), landing the victim's browser in a session tied to the attacker's
 * Google account.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext): { state?: string } {
    const request = context.switchToHttp().getRequest<Request>();
    // This guard also runs on the callback. Minting a new state there would
    // overwrite the cookie the callback still needs to compare.
    if (typeof request.query.code === 'string') {
      return {};
    }

    const response = context.switchToHttp().getResponse<Response>();
    const state = randomBytes(24).toString('hex');

    response.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.protocol === 'https',
      path: '/',
      maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
    });

    return { state };
  }
}
