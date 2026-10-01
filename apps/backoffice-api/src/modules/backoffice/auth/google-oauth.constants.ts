import type { BackofficeGoogleError } from '@agendya/types';

/** Passport strategy name — distinct from apps/api's `google`. */
export const BACKOFFICE_GOOGLE_STRATEGY = 'backoffice-google';

/** Own cookie name so it never collides with apps/api's `oauth_state`. */
export const BACKOFFICE_OAUTH_STATE_COOKIE = 'bo_oauth_state';
export const BACKOFFICE_OAUTH_STATE_COOKIE_MAX_AGE_MS = 5 * 60 * 1000;

/** Placeholder so the strategy can be constructed when Google is disabled. */
export const GOOGLE_NOT_CONFIGURED_CLIENT_ID = 'google-oauth-not-configured';

/** What `BackofficeGoogleStrategy.validate` hands to the controller. */
export interface BackofficeGoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Thrown anywhere in the Google flow; `BackofficeGoogleCallbackFilter` turns
 * it into a redirect to `/backoffice/login?error=<code>`.
 */
export class BackofficeGoogleAuthError extends Error {
  constructor(readonly code: BackofficeGoogleError) {
    super(code);
    this.name = 'BackofficeGoogleAuthError';
  }
}

export function isGoogleConfigured(config: {
  clientId?: string;
  clientSecret?: string;
}): boolean {
  return Boolean(config.clientId && config.clientSecret);
}
