import type {
  AddTicketMessageInput,
  AssignTicketInput,
  CreateTicketInput,
  SupportTicketDetail,
  TicketListQuery,
  TicketListResponse,
  UpdateTicketPriorityInput,
  UpdateTicketStatusInput,
} from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function listTickets(
  query: Partial<TicketListQuery>,
): Promise<TicketListResponse> {
  const { data } = await backofficeApiClient.get<TicketListResponse>(
    '/backoffice/tickets',
    { params: query },
  );
  return data;
}

export async function getTicket(id: string): Promise<SupportTicketDetail> {
  const { data } = await backofficeApiClient.get<SupportTicketDetail>(
    `/backoffice/tickets/${id}`,
  );
  return data;
}

export async function createTicket(
  input: CreateTicketInput,
): Promise<SupportTicketDetail> {
  const { data } = await backofficeApiClient.post<SupportTicketDetail>(
    '/backoffice/tickets',
    input,
  );
  return data;
}

export async function addTicketMessage(
  id: string,
  input: AddTicketMessageInput,
): Promise<SupportTicketDetail> {
  const { data } = await backofficeApiClient.post<SupportTicketDetail>(
    `/backoffice/tickets/${id}/messages`,
    input,
  );
  return data;
}

export async function updateTicketStatus(
  id: string,
  input: UpdateTicketStatusInput,
): Promise<SupportTicketDetail> {
  const { data } = await backofficeApiClient.patch<SupportTicketDetail>(
    `/backoffice/tickets/${id}/status`,
    input,
  );
  return data;
}

export async function updateTicketPriority(
  id: string,
  input: UpdateTicketPriorityInput,
): Promise<SupportTicketDetail> {
  const { data } = await backofficeApiClient.patch<SupportTicketDetail>(
    `/backoffice/tickets/${id}/priority`,
    input,
  );
  return data;
}

export async function assignTicket(
  id: string,
  input: AssignTicketInput,
): Promise<SupportTicketDetail> {
  const { data } = await backofficeApiClient.patch<SupportTicketDetail>(
    `/backoffice/tickets/${id}/assign`,
    input,
  );
  return data;
}
