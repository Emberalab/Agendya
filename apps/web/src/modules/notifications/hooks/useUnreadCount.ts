import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/authStore';
import { getUnreadCount } from '../api';
import { UNREAD_COUNT_KEY } from '../queryKeys';

/**
 * The unread badge count. Fetched once on dashboard mount (so a professional
 * who was offline still sees what they missed), refreshed on window focus, and
 * kept current between fetches by optimistic updates in the mark-read mutations
 * and by the real-time `notification.created` handler.
 */
export function useUnreadCount() {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadCount,
    enabled: Boolean(token),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
