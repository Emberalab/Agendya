import type {
  ActivityListParams,
  ActivityListResponse,
  ActivitySummary,
  TrialListQuery,
  TrialListResponse,
} from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function getActivitySummary(
  professionalId: string,
): Promise<ActivitySummary> {
  const { data } = await backofficeApiClient.get<ActivitySummary>(
    `/backoffice/professionals/${professionalId}/activity/summary`,
  );
  return data;
}

export async function listActivity(
  professionalId: string,
  params: ActivityListParams,
): Promise<ActivityListResponse> {
  const { data } = await backofficeApiClient.get<ActivityListResponse>(
    `/backoffice/professionals/${professionalId}/activity`,
    { params },
  );
  return data;
}

export async function listTrials(
  params: Partial<TrialListQuery>,
): Promise<TrialListResponse> {
  const { data } = await backofficeApiClient.get<TrialListResponse>(
    '/backoffice/trials',
    {
      params,
    },
  );
  return data;
}
