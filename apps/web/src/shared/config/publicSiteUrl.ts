/** Origin of the customer-facing booking site (`/:slug`, cancel links). */
export function publicSiteOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  if (configured) {
    return configured;
  }
  return window.location.origin;
}

export function publicBookingUrl(slug: string): string {
  const path = slug.replace(/^\/+/, '');
  return `${publicSiteOrigin()}/${path}`;
}
