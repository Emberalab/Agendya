import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/authStore';
import { updateMyProfile } from '../api';
import { PROFILE_QUERY_KEY } from './useProfile';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      // The sidebar/top-bar avatar's initial and business name read from
      // the auth store, not this query cache — keep them in sync the moment
      // a save succeeds instead of only on next login. See the comment on
      // `updateUser` in authStore.ts.
      updateUser({ businessName: data.businessName, slug: data.slug });
    },
  });
}
