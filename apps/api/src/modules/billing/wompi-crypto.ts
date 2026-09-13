import { createHash, timingSafeEqual } from 'node:crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left.toLowerCase());
  const b = Buffer.from(right.toLowerCase());
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Widget integrity: SHA256(`${reference}${amountInCents}${currency}${secret}`). */
export function wompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string,
): string {
  return sha256Hex(`${reference}${amountInCents}${currency}${integritySecret}`);
}

function scalarToString(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return '';
}

function readPath(data: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

/**
 * Event authenticity: concatenate `signature.properties` values (from
 * `data`), then `timestamp`, then the events secret. Compare SHA256 hex.
 */
export function verifyWompiEventChecksum(params: {
  data: unknown;
  properties: string[];
  timestamp: number;
  checksum: string;
  eventsSecret: string;
}): boolean {
  const values = params.properties.map((path) =>
    scalarToString(readPath(params.data, path)),
  );
  const payload = `${values.join('')}${params.timestamp}${params.eventsSecret}`;
  return safeEqualHex(sha256Hex(payload), params.checksum);
}
