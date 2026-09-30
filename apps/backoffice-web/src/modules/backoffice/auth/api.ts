import type { BackofficeAuthResponse, BackofficeLoginInput } from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function backofficeLogin(
  input: BackofficeLoginInput,
): Promise<BackofficeAuthResponse> {
  const { data } = await backofficeApiClient.post<BackofficeAuthResponse>(
    '/backoffice/auth/login',
    input,
  );
  return data;
}
