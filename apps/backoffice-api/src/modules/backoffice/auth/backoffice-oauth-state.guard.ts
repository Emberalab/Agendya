import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  BACKOFFICE_OAUTH_STATE_COOKIE,
  BackofficeGoogleAuthError,
} from './google-oauth.constants';

/** Parses the raw `Cookie:` header without pulling in cookie-parser. */
function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    if (part.slice(0, separatorIndex).trim() === name) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return undefined;
}

/**
 * Runs before the Google strategy on the callback: the `state` query param
 * must match the cookie set when the flow started (login-CSRF protection,
 * same as apps/api's GoogleOAuthStateGuard). The cookie is single-use.
 */
@Injectable()
export class BackofficeOAuthStateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const cookieState = readCookie(request, BACKOFFICE_OAUTH_STATE_COOKIE);
    const queryState = request.query.state;

    response.clearCookie(BACKOFFICE_OAUTH_STATE_COOKIE, {
      path: '/backoffice/auth',
    });

    if (
      !cookieState ||
      typeof queryState !== 'string' ||
      queryState !== cookieState
    ) {
      throw new BackofficeGoogleAuthError('google_failed');
    }
    return true;
  }
}
