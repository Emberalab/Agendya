const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Unique, slash-trimmed frontend origins from env (dashboard + public site). */
export function configuredOrigins(
  ...urls: Array<string | undefined>
): string[] {
  const seen = new Set<string>();
  const origins: string[] = [];
  for (const url of urls) {
    const trimmed = url?.trim();
    if (!trimmed) continue;
    const origin = stripTrailingSlash(trimmed);
    if (seen.has(origin)) continue;
    seen.add(origin);
    origins.push(origin);
  }
  return origins;
}

/**
 * Whether a request `Origin` should be allowed by CORS: an exact match on any
 * configured frontend URL, or any http(s) origin on localhost/a private
 * network address (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
 * The latter covers `npm run dev:web:host`, where the frontend is opened from
 * a LAN IP rather than `webUrl` — see README and CLAUDE.md.
 */
export function isAllowedOrigin(
  origin: string,
  allowedOrigins: string | readonly string[],
): boolean {
  const list = Array.isArray(allowedOrigins)
    ? allowedOrigins
    : [allowedOrigins];
  if (list.some((webUrl) => webUrl && origin === webUrl)) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  return (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    PRIVATE_HOST_PATTERN.test(parsed.hostname)
  );
}
