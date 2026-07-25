import { useQuery } from '@tanstack/react-query';
import { listExceptions } from '../api';

export const EXCEPTIONS_QUERY_KEY = ['schedules', 'exceptions'] as const;

export function useExceptions() {
  return useQuery({ queryKey: EXCEPTIONS_QUERY_KEY, queryFn: listExceptions });
}
