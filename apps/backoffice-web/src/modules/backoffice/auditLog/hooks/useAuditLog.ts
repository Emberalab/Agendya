import { useQuery } from '@tanstack/react-query';
import type { AuditLogListQuery } from '@agendya/types';
import { listAuditLog } from '../api';

export function useAuditLog(filters: Partial<AuditLogListQuery> = {}) {
  return useQuery({
    queryKey: ['backoffice', 'audit-log', filters],
    queryFn: () => listAuditLog(filters),
  });
}
