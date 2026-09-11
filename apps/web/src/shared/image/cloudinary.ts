/**
 * Cloudinary delivery URLs come back from the API as the stored derived asset —
 * already size-capped at upload time (see
 * `apps/api/src/infra/upload/upload.service.ts`: covers to 1600×600, logos to
 * 400×400) — but with no format or quality transform, so they ship the original
 * JPEG/PNG at full quality. Injecting `f_auto,q_auto` lets Cloudinary serve
 * WebP/AVIF at a perceptual-quality target (typically 30–50% smaller) with no
 * visible change, and `c_limit,w_<n>` trims a cover that renders far narrower
 * than it was stored.
 *
 * Anything that isn't a `res.cloudinary.com` `/image/upload/` URL — a blob:
 * preview straight off the file input, an empty string, a future different host —
 * is returned untouched.
 */
const UPLOAD_SEGMENT = '/image/upload/';

export function cloudinaryImageUrl(
  url: string,
  { width }: { width?: number } = {},
): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const at = url.indexOf(UPLOAD_SEGMENT);
  if (at === -1) return url;

  const insertAt = at + UPLOAD_SEGMENT.length;
  const rest = url.slice(insertAt);

  // Already carries a transformation (built by a previous call, or one day by
  // the API itself) — don't stack a second one.
  if (/^(f_auto|q_auto|c_limit|w_\d|dpr_)/.test(rest)) return url;

  const transform = width
    ? `f_auto,q_auto,c_limit,w_${Math.round(width)}`
    : 'f_auto,q_auto';

  return `${url.slice(0, insertAt)}${transform}/${rest}`;
}
