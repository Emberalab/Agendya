const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes text for safe interpolation into an HTML email body. Every value
 * MailService interpolates into a template (`customerName`, `businessName`,
 * `serviceName`, ...) ultimately comes from user input — a public,
 * unauthenticated booking form in the case of `customerName` — so without
 * this, a booking could carry arbitrary HTML (e.g. `<a href="...">`) into an
 * email delivered to a different user (the professional receiving the
 * notification, or the customer's own confirmation), enabling phishing or
 * link/content spoofing in their inbox.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
