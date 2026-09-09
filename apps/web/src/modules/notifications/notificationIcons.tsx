import type { NotificationType } from '@agendya/types';

/** Bell — used for the dashboard trigger button. */
export function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5v2.6c0 .5-.2 1-.55 1.36L3.8 12.2c-.6.6-.17 1.65.68 1.65h11.04c.85 0 1.28-1.04.68-1.65l-1.15-1.24A1.94 1.94 0 0 1 14.5 9.6V7A4.5 4.5 0 0 0 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 15.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Per-type glyph shown at the start of each notification row. */
export function NotificationTypeIcon({ type }: { type: NotificationType }) {
  if (type === 'APPOINTMENT_CREATED') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 1.5v3M11 1.5v3M1.5 7h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8 9v3.5M6.25 10.75h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return <BellIcon size={16} />;
}
