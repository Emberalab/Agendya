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
