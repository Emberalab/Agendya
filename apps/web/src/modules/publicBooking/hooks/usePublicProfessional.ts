import { useQuery } from '@tanstack/react-query';
import { getPublicProfessional } from '../api';

export function usePublicProfessional(slug: string) {
  return useQuery({
    queryKey: ['public', 'professionals', slug],
    queryFn: () => getPublicProfessional(slug),
    retry: false,
  });
}
