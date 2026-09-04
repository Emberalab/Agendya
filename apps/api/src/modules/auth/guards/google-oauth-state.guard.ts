import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OAUTH_STATE_COOKIE } from './oauth-state.constants';

/** Parses the raw `Cookie:` header without pulling in the cookie-parser package. */
function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) {
    return undefined;
  }
  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return undefined;
}

/**
 * Runs before the Google strategy on the OAuth callback route: rejects the
 * request unless its `state` query param matches the httpOnly cookie
 * GoogleAuthGuard set when the flow was initiated. See GoogleAuthGuard for
 * why this matters (login CSRF).
 */
@Injectable()
export class GoogleOAuthStateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const cookieState = readCookie(request, OAUTH_STATE_COOKIE);
    const queryState = request.query.state;

    response.clearCookie(OAUTH_STATE_COOKIE);

    if (
      !cookieState ||
      typeof queryState !== 'string' ||
      queryState !== cookieState
    ) {
      throw new ForbiddenException('Solicitud de autenticación inválida.');
    }
    return true;
  }
}
