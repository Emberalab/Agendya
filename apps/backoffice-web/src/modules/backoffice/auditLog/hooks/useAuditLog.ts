import { useInfiniteQuery } from '@tanstack/react-query';
import type { AuditLogListQuery } from '@agendya/types';
import { listAuditLog } from '../api';

// Cursor-paginated (was capped at the first 30 entries with no way to see
// older ones).
export function useAuditLog(filters: Partial<AuditLogListQuery> = {}) {
  return useInfiniteQuery({
    queryKey: ['backoffice', 'audit-log', filters],
    queryFn: ({ pageParam }) => listAuditLog({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
