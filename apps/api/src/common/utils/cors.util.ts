const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

/**
 * Whether a request `Origin` should be allowed by CORS: an exact match on the
 * configured frontend URL, or any http(s) origin on localhost/a private
 * network address (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
 * The latter covers `npm run dev:web:host`, where the frontend is opened from
 * a LAN IP rather than `webUrl` — see README and CLAUDE.md.
 */
export function isAllowedOrigin(origin: string, webUrl: string): boolean {
  if (webUrl && origin === webUrl) {
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
