import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createException } from '../api';
import { EXCEPTIONS_QUERY_KEY } from './useExceptions';

export function useCreateException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createException,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EXCEPTIONS_QUERY_KEY });
    },
  });
}
