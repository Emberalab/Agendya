import { useAuthStore } from '../../modules/auth/authStore';

// Falls back to whatever host the page was loaded from (e.g. a LAN IP when the
// frontend is opened from another device via `vite --host`), so the API stays
// reachable without hardcoding a machine-specific address. Exported so the
// real-time SSE client (`shared/realtime/realtimeClient.ts`) resolves the same
// origin without duplicating this logic.
export const apiBaseUrl =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  params?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Error thrown for any non-2xx response. Carries the parsed body (`data`) and
 * `status` so callers can branch on them — `getApiErrorMessage` and the booking
 * wizard's conflict detection rely on this shape.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, data: unknown) {
    super(`Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(path, apiBaseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<{ data: T }> {
  const headers = new Headers(options.headers);

  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
    // Let the browser set multipart/form-data with the correct boundary.
    headers.delete('Content-Type');
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    body: payload,
    signal: options.signal,
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    throw new ApiError(response.status, data);
  }

  return { data: data as T };
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
