import type { UpdateServiceInput } from '@ronda/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateService } from '../api';
import { SERVICES_QUERY_KEY } from './useServices';

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateServiceInput }) =>
      updateService(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });
}
