import { useQuery } from '@tanstack/react-query';
import { getWorkingHours } from '../api';

export const WORKING_HOURS_QUERY_KEY = ['schedules', 'working-hours'] as const;

export function useWorkingHours() {
  return useQuery({
    queryKey: WORKING_HOURS_QUERY_KEY,
    queryFn: getWorkingHours,
  });
}
