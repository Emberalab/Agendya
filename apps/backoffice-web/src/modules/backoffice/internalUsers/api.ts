import type {
  CreateInternalUserInput,
  InternalUser,
  UpdateInternalUserRoleInput,
  UpdateInternalUserStatusInput,
} from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function listInternalUsers(): Promise<InternalUser[]> {
  const { data } = await backofficeApiClient.get<InternalUser[]>(
    '/backoffice/internal-users',
  );
  return data;
}

export async function createInternalUser(
  input: CreateInternalUserInput,
): Promise<InternalUser> {
  const { data } = await backofficeApiClient.post<InternalUser>(
    '/backoffice/internal-users',
    input,
  );
  return data;
}

export async function updateInternalUserRole(
  id: string,
  input: UpdateInternalUserRoleInput,
): Promise<InternalUser> {
  const { data } = await backofficeApiClient.patch<InternalUser>(
    `/backoffice/internal-users/${id}/role`,
    input,
  );
  return data;
}

export async function updateInternalUserStatus(
  id: string,
  input: UpdateInternalUserStatusInput,
): Promise<InternalUser> {
  const { data } = await backofficeApiClient.patch<InternalUser>(
    `/backoffice/internal-users/${id}/status`,
    input,
  );
  return data;
}
