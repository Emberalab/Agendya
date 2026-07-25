import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setWorkingHours } from '../api';
import { WORKING_HOURS_QUERY_KEY } from './useWorkingHours';

export function useSetWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setWorkingHours,
    onSuccess: (data) => {
      queryClient.setQueryData(WORKING_HOURS_QUERY_KEY, data);
    },
  });
}
