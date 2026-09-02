import { useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicateService } from '../api';
import { SERVICES_QUERY_KEY } from './useServices';

export function useDuplicateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicateService,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
