import { useQuery } from '@tanstack/react-query';
import { listServices } from '../api';

export const SERVICES_QUERY_KEY = ['services'] as const;

export function useServices() {
  return useQuery({ queryKey: SERVICES_QUERY_KEY, queryFn: listServices });
}
