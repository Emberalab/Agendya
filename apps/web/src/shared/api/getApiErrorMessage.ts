import { isApiError } from './apiClient';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error. Intenta de nuevo.',
): string {
  if (isApiError(error)) {
    const data = error.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) {
      return data.message.join(' ');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
  }
  return fallback;
}
