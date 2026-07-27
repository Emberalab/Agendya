import type {
  CreateServiceInput,
  Service,
  UpdateServiceInput,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function listServices(): Promise<Service[]> {
  const { data } = await apiClient.get<Service[]>('/services');
  return data;
}

export async function createService(
  input: CreateServiceInput,
): Promise<Service> {
  const { data } = await apiClient.post<Service>('/services', input);
  return data;
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<Service> {
  const { data } = await apiClient.patch<Service>(`/services/${id}`, input);
  return data;
}

export async function deleteService(id: string): Promise<Service> {
  const { data } = await apiClient.delete<Service>(`/services/${id}`);
  return data;
}
