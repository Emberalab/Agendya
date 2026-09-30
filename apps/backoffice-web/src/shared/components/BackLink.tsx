import { Link } from 'react-router-dom';

// Same "← Volver a X" convention as apps/web's SupportTicketDetailPage —
// every Backoffice detail page (a ticket, a professional, an appointment)
// otherwise had no way back except the browser's own back button.
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="mb-3 inline-block text-sm font-semibold text-text-brand hover:underline">
      ← {children}
    </Link>
  );
}
