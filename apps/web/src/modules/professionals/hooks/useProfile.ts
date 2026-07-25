import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '../api';

export const PROFILE_QUERY_KEY = ['professionals', 'me'] as const;

export function useProfile() {
  return useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: getMyProfile });
}
