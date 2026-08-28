import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '../api';

export function useAvailability(
  slug: string,
  serviceIds: string[],
  date: string,
) {
  return useQuery({
    queryKey: [
      'public',
      'professionals',
      slug,
      'availability',
      serviceIds.join(','),
      date,
    ],
    queryFn: () => getAvailability(slug, serviceIds, date),
    enabled: serviceIds.length > 0 && Boolean(date),
  });
}
