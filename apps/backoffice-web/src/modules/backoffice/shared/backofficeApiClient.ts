import { useBackofficeAuthStore } from '../auth/backofficeAuthStore';

// Base URL for the Backoffice API (apps/backoffice-api) — a separate
// deployed service from the professional-facing API (apps/api), on its own
// port/domain. `VITE_BACKOFFICE_API_URL` points at a fixed backend
// (staging); otherwise localhost talks straight to the Nest dev server on
// :4001, and anything else assumes same-origin (a reverse proxy in front of
// both apps on the deployed domain).
export const apiBaseUrl = resolveApiBaseUrl();

function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_BACKOFFICE_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4001';
  }
  return window.location.origin;
}

export class BackofficeApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, data: unknown) {
    super(`Request failed with status ${status}`);
    this.name = 'BackofficeApiError';
    this.status = status;
    this.data = data;
  }
}

export function isBackofficeApiError(
  error: unknown,
): error is BackofficeApiError {
  return error instanceof BackofficeApiError;
}

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${apiBaseUrl}${path}`);
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
  const headers = new Headers();

  const { accessToken } = useBackofficeAuthStore.getState();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    payload = JSON.stringify(body);
    headers.set('Content-Type', 'application/json');
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
      useBackofficeAuthStore.getState().logout();
    }
    throw new BackofficeApiError(response.status, data);
  }

  return { data: data as T };
}

export const backofficeApiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
};
