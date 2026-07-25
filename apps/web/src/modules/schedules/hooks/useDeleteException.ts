import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteException } from '../api';
import { EXCEPTIONS_QUERY_KEY } from './useExceptions';

export function useDeleteException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteException,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EXCEPTIONS_QUERY_KEY });
    },
  });
}
