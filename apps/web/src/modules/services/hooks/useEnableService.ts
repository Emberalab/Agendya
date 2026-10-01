import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Service } from '@agendya/types';
import { enableService } from '../api';

export function useEnableService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enableService,
    onSuccess: (changed: Service[]) => {
      const byId = new Map(changed.map((s) => [s.id, s]));
      queryClient.setQueryData<Service[]>(['services'], (old) =>
        old ? old.map((s) => byId.get(s.id) ?? s) : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
