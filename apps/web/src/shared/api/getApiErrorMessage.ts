import { ACCOUNT_NOT_FOUND_CODE } from '@agendya/types';
import { isApiError } from './apiClient';

/** The shape `ZodValidationPipe` throws: `{ message: 'Validation failed', errors: z.ZodError['flatten']() }'. */
interface ZodValidationErrorPayload {
  message?: string | string[];
  code?: string;
  errors?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error. Intenta de nuevo.',
): string {
  if (isApiError(error)) {
    const data = error.data as ZodValidationErrorPayload | undefined;
    // `ZodValidationPipe` replies with a flat, always-"Validation failed"
    // `message` and puts the actual per-field reasons under `errors` — read
    // those first, or every request rejected by it (any endpoint, not just
    // booking creation) shows the same uninformative string regardless of
    // which field or limit actually failed.
    const fieldMessages = Object.values(data?.errors?.fieldErrors ?? {})
      .flat()
      .filter((m): m is string => Boolean(m));
    const formMessages = data?.errors?.formErrors ?? [];
    const zodMessages = [...formMessages, ...fieldMessages];
    if (zodMessages.length > 0) {
      return zodMessages.join(' ');
    }
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

export function isAccountNotFoundError(error: unknown): boolean {
  if (!isApiError(error) || error.status !== 401) {
    return false;
  }
  return payloadHasCode(error.data, ACCOUNT_NOT_FOUND_CODE);
}

function payloadHasWaitlistCode(data: unknown): boolean {
  if (payloadHasCode(data, 'WAITLIST_REQUIRED')) {
    return true;
  }
  if (!data || typeof data !== 'object') {
    return false;
  }
  const payload = data as { message?: unknown };
  return (
    typeof payload.message === 'string' &&
    payload.message.toLowerCase().includes('lista de espera')
  );
}

function payloadHasCode(data: unknown, code: string): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const payload = data as { code?: unknown; message?: unknown };
  if (payload.code === code) {
    return true;
  }
  if (payload.message && typeof payload.message === 'object') {
    return payloadHasCode(payload.message, code);
  }
  return false;
}
