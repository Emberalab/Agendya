import type {
  AddSupportMessageInput,
  CreateSupportTicketInput,
  SupportTicketDetail,
  SupportTicketListQuery,
  TicketListResponse,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function listMyTickets(
  query: SupportTicketListQuery,
): Promise<TicketListResponse> {
  const { data } = await apiClient.get<TicketListResponse>('/support/tickets', {
    params: query,
  });
  return data;
}

export async function getMyTicket(id: string): Promise<SupportTicketDetail> {
  const { data } = await apiClient.get<SupportTicketDetail>(
    `/support/tickets/${id}`,
  );
  return data;
}

export async function createMyTicket(
  input: CreateSupportTicketInput,
): Promise<SupportTicketDetail> {
  const { data } = await apiClient.post<SupportTicketDetail>(
    '/support/tickets',
    input,
  );
  return data;
}

export async function addMyTicketMessage(
  id: string,
  input: AddSupportMessageInput,
): Promise<SupportTicketDetail> {
  const { data } = await apiClient.post<SupportTicketDetail>(
    `/support/tickets/${id}/messages`,
    input,
  );
  return data;
}
