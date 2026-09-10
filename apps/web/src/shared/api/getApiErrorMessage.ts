import { isApiError } from './apiClient';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error. Intenta de nuevo.',
): string {
  if (isApiError(error)) {
    const data = error.data as
      | { message?: string | string[]; code?: string }
      | undefined;
    if (Array.isArray(data?.message)) {
      return data.message.join(' ');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
  }
  return fallback;
}

export function isWaitlistRequiredError(error: unknown): boolean {
  if (!isApiError(error) || error.status !== 403) {
    return false;
  }
  return payloadHasWaitlistCode(error.data);
}

function payloadHasWaitlistCode(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const payload = data as { code?: unknown; message?: unknown };
  if (payload.code === 'WAITLIST_REQUIRED') {
    return true;
  }
  if (payload.message && typeof payload.message === 'object') {
    return payloadHasWaitlistCode(payload.message);
  }
  return (
    typeof payload.message === 'string' &&
    payload.message.toLowerCase().includes('lista de espera')
  );
}
