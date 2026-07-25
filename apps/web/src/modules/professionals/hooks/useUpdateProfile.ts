import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile } from '../api';
import { PROFILE_QUERY_KEY } from './useProfile';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
    },
  });
}
