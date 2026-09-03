import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '../api';

export function useAvailability(
  slug: string,
  serviceIds: string[],
  date: string,
  atHome = false,
) {
  return useQuery({
    queryKey: [
      'public',
      'professionals',
      slug,
      'availability',
      serviceIds.join(','),
      date,
      atHome,
    ],
    queryFn: () => getAvailability(slug, serviceIds, date, atHome),
    enabled: serviceIds.length > 0 && Boolean(date),
  });
}
