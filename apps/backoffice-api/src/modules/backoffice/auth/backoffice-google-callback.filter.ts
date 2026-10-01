import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { BackofficeGoogleError } from '@agendya/types';
import { BackofficeGoogleAuthError } from './google-oauth.constants';

/**
 * Every failure in the Google flow is a full-page navigation, so it must end
 * on the Backoffice login screen with a reason — never on a JSON error page
 * served by the API origin.
 */
@Catch()
export class BackofficeGoogleCallbackFilter implements ExceptionFilter {
  private readonly logger = new Logger(BackofficeGoogleCallbackFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let code: BackofficeGoogleError = 'google_failed';
    if (exception instanceof BackofficeGoogleAuthError) {
      code = exception.code;
    } else {
      this.logger.warn(
        `Google sign-in failed: ${exception instanceof Error ? exception.message : String(exception)}`,
      );
    }
    const webUrl =
      this.configService.get<string>('backofficeWebUrl') ??
      'http://localhost:5174';
    response.redirect(`${webUrl}/backoffice/login?error=${code}`);
  }
}
