import type { AuthResponse, LoginInput, RegisterInput } from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
  return data;
}
