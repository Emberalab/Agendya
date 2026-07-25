import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteService } from '../api';
import { SERVICES_QUERY_KEY } from './useServices';

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
