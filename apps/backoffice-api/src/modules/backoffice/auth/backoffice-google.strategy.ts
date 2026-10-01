import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import {
  BACKOFFICE_GOOGLE_STRATEGY,
  GOOGLE_NOT_CONFIGURED_CLIENT_ID,
  type BackofficeGoogleProfile,
} from './google-oauth.constants';

/**
 * Google OAuth for Backoffice staff. Only extracts identity; whether that
 * identity may sign in is decided by `BackofficeAuthService.googleLogin`.
 * Always registered — when GOOGLE_CLIENT_ID/SECRET are missing it's built
 * with a placeholder client id and `BackofficeGoogleAuthGuard` refuses to
 * start the flow, so the API still boots without Google configured.
 */
@Injectable()
export class BackofficeGoogleStrategy extends PassportStrategy(
  Strategy,
  BACKOFFICE_GOOGLE_STRATEGY,
) {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('google.clientId') ??
        GOOGLE_NOT_CONFIGURED_CLIENT_ID,
      clientSecret:
        configService.get<string>('google.clientSecret') ??
        GOOGLE_NOT_CONFIGURED_CLIENT_ID,
      callbackURL: configService.get<string>('google.callbackUrl')!,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const primary = profile.emails?.[0];
    const user: BackofficeGoogleProfile = {
      googleId: profile.id,
      email: (primary?.value ?? '').trim().toLowerCase(),
      emailVerified: primary?.verified === true,
    };
    done(null, user);
  }
}
