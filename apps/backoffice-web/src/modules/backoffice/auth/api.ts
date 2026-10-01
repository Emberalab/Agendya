import type {
  BackofficeAuthResponse,
  BackofficeForgotPasswordInput,
  BackofficeLoginInput,
  BackofficeResetPasswordInput,
  InternalUser,
} from '@agendya/types';
import { apiBaseUrl, backofficeApiClient } from '../shared/backofficeApiClient';

export async function backofficeLogin(
  input: BackofficeLoginInput,
): Promise<BackofficeAuthResponse> {
  const { data } = await backofficeApiClient.post<BackofficeAuthResponse>(
    '/backoffice/auth/login',
    input,
  );
  return data;
}

export async function requestPasswordReset(
  input: BackofficeForgotPasswordInput,
): Promise<void> {
  await backofficeApiClient.post('/backoffice/auth/forgot-password', input);
}

export async function resetPassword(
  input: BackofficeResetPasswordInput,
): Promise<void> {
  await backofficeApiClient.post('/backoffice/auth/reset-password', input);
}

/** Loads the staff profile for a token that isn't stored yet (Google). */
export async function fetchMe(accessToken: string): Promise<InternalUser> {
  const { data } = await backofficeApiClient.get<InternalUser>(
    '/backoffice/auth/me',
    { accessToken },
  );
  return data;
}

/** Full-page navigation to the API, which redirects to Google. */
export function googleSignInUrl(): string {
  return `${apiBaseUrl}/backoffice/auth/google`;
}

/** Survives the round trip to Google within this tab. */
export const PENDING_REMEMBER_KEY = 'agendya-backoffice-pending-remember';
