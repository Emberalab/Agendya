import { useQuery } from '@tanstack/react-query';
import { getProfessional360 } from '../api';

export function useProfessional360(id: string) {
  return useQuery({
    queryKey: ['backoffice', 'professionals', id],
    queryFn: () => getProfessional360(id),
    enabled: !!id,
  });
}
