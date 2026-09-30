import type {
  BackofficeDashboard,
  BackofficeSearchResult,
} from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function getDashboardSummary(): Promise<BackofficeDashboard> {
  const { data } = await backofficeApiClient.get<BackofficeDashboard>(
    '/backoffice/dashboard',
  );
  return data;
}

export async function searchBackoffice(
  q: string,
): Promise<BackofficeSearchResult> {
  const { data } = await backofficeApiClient.get<BackofficeSearchResult>(
    '/backoffice/search',
    { params: { q } },
  );
  return data;
}
