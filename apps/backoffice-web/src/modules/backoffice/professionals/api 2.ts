import type { Professional360 } from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function getProfessional360(id: string): Promise<Professional360> {
  const { data } = await backofficeApiClient.get<Professional360>(
    `/backoffice/professionals/${id}`,
  );
  return data;
}
