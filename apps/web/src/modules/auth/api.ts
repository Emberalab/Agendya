import type {
  AuthResponse,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
  return data;
}

export async function forgotPassword(
  input: ForgotPasswordInput,
): Promise<{ success: true }> {
  const { data } = await apiClient.post<{ success: true }>(
    '/auth/forgot-password',
    input,
  );
  return data;
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<{ success: true }> {
  const { data } = await apiClient.post<{ success: true }>(
    '/auth/reset-password',
    input,
  );
  return data;
}
