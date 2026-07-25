import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createService } from '../api';
import { SERVICES_QUERY_KEY } from './useServices';

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createService,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
