import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { frontendWebUrl } from './frontend-web-url';
import { WAITLIST_REQUIRED_CODE } from './professional-allowlist';

@Catch(ForbiddenException, UnauthorizedException)
export class GoogleOauthCallbackFilter implements ExceptionFilter {
  catch(
    exception: ForbiddenException | UnauthorizedException,
    host: ArgumentsHost,
  ): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const webUrl = frontendWebUrl();

    if (isWaitlistForbidden(exception)) {
      const email = googleEmailFromRequest(request);
      const params = new URLSearchParams({ waitlist: '1' });
      if (email) {
        params.set('email', email);
      }
      response.redirect(`${webUrl}/register?${params.toString()}`);
      return;
    }

    response.redirect(`${webUrl}/login?error=oauth`);
  }
}

function isWaitlistForbidden(
  exception: ForbiddenException | UnauthorizedException,
): boolean {
  const body = exception.getResponse();
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    (body as { code?: string }).code === WAITLIST_REQUIRED_CODE
  );
}

function googleEmailFromRequest(request: Request): string | undefined {
  const user = request.user as { email?: unknown } | undefined;
  return typeof user?.email === 'string' && user.email.includes('@')
    ? user.email
    : undefined;
}
