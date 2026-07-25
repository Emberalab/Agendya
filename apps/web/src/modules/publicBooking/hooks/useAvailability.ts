import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '../api';

export function useAvailability(
  slug: string,
  serviceId: string | null,
  date: string,
) {
  return useQuery({
    queryKey: [
      'public',
      'professionals',
      slug,
      'availability',
      serviceId,
      date,
    ],
    queryFn: () => getAvailability(slug, serviceId!, date),
    enabled: Boolean(serviceId) && Boolean(date),
  });
}
