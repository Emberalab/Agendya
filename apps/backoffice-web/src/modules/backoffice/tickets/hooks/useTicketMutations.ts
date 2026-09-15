import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AddTicketMessageInput,
  AssignTicketInput,
  CreateTicketInput,
  UpdateTicketPriorityInput,
  UpdateTicketStatusInput,
} from '@agendya/types';
import {
  addTicketMessage,
  assignTicket,
  createTicket,
  updateTicketPriority,
  updateTicketStatus,
} from '../api';
import { TICKETS_QUERY_KEY } from './useTickets';
import { ticketQueryKey } from './useTicket';

function useInvalidateTicket(id?: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: ticketQueryKey(id) });
    }
  };
}

export function useCreateTicket() {
  const invalidate = useInvalidateTicket();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: invalidate,
  });
}

export function useAddTicketMessage(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: (input: AddTicketMessageInput) =>
      addTicketMessage(ticketId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateTicketStatus(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: (input: UpdateTicketStatusInput) =>
      updateTicketStatus(ticketId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateTicketPriority(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: (input: UpdateTicketPriorityInput) =>
      updateTicketPriority(ticketId, input),
    onSuccess: invalidate,
  });
}

export function useAssignTicket(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: (input: AssignTicketInput) => assignTicket(ticketId, input),
    onSuccess: invalidate,
  });
}
