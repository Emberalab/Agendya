import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ActivityListParams, TrialListQuery } from '@agendya/types';
import { getActivitySummary, listActivity, listTrials } from '../api';

export function useActivitySummary(professionalId: string) {
  return useQuery({
    queryKey: ['backoffice', 'activity', professionalId, 'summary'],
    queryFn: () => getActivitySummary(professionalId),
    enabled: !!professionalId,
  });
}

/** Server-paginated timeline; each "load more" fetches the next keyset page. */
export function useActivityTimeline(
  professionalId: string,
  filters: Omit<ActivityListParams, 'cursor'>,
) {
  return useInfiniteQuery({
    queryKey: ['backoffice', 'activity', professionalId, 'timeline', filters],
    queryFn: ({ pageParam }) =>
      listActivity(professionalId, { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!professionalId,
  });
}

export function useTrials(status: TrialListQuery['status']) {
  return useInfiniteQuery({
    queryKey: ['backoffice', 'trials', status],
    queryFn: ({ pageParam }) => listTrials({ status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
