import type { AuditLogListQuery, AuditLogListResponse } from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function listAuditLog(
  query: Partial<AuditLogListQuery>,
): Promise<AuditLogListResponse> {
  const { data } = await backofficeApiClient.get<AuditLogListResponse>(
    '/backoffice/audit-log',
    { params: query },
  );
  return data;
}
