import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddSupportMessageInput, CreateSupportTicketInput } from '@agendya/types';
import { addMyTicketMessage, createMyTicket } from '../api';
import { MY_TICKETS_QUERY_KEY } from './useMyTickets';
import { myTicketQueryKey } from './useMyTicket';

function useInvalidateMyTickets(id?: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: myTicketQueryKey(id) });
    }
  };
}

export function useCreateMyTicket() {
  const invalidate = useInvalidateMyTickets();
  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) => createMyTicket(input),
    onSuccess: invalidate,
  });
}

export function useAddMyTicketMessage(ticketId: string) {
  const invalidate = useInvalidateMyTickets(ticketId);
  return useMutation({
    mutationFn: (input: AddSupportMessageInput) =>
      addMyTicketMessage(ticketId, input),
    onSuccess: invalidate,
  });
}
