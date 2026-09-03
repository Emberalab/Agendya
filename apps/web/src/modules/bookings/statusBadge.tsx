import type { BookingStatus } from '@agendya/types';
import { STATUS_CFG } from './statusConfig';

function StatusIcon({ status, color }: { status: BookingStatus; color: string }) {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.4" />
          <path d="M4.3 7l1.9 1.9L9.7 5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'CANCELLED':
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.4" />
          <path d="M5 5l4 4M9 5l-4 4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'PENDING':
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.4" />
          <path d="M7 3.8v3.4l2.2 2.2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'NO_SHOW':
      return (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.4" />
          <path d="M7 4v3.2l2 2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
      }}
    >
      <StatusIcon status={status} color={cfg.color} />
      {cfg.label}
    </span>
  );
}
