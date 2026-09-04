import type { BookingStatus } from '@agendya/types';

// Colors are CSS custom properties (main.scss) so each status badge adapts
// between the light and dark themes instead of rendering a fixed light pastel.
export const STATUS_CFG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: 'Pendiente',
    color: 'var(--status-pending-color)',
    bg: 'var(--status-pending-bg)',
    border: 'var(--status-pending-border)',
  },
  CONFIRMED: {
    label: 'Confirmada',
    color: 'var(--status-confirmed-color)',
    bg: 'var(--status-confirmed-bg)',
    border: 'var(--status-confirmed-border)',
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'var(--status-cancelled-color)',
    bg: 'var(--status-cancelled-bg)',
    border: 'var(--status-cancelled-border)',
  },
  COMPLETED: {
    label: 'Completada',
    color: 'var(--status-completed-color)',
    bg: 'var(--status-completed-bg)',
    border: 'var(--status-completed-border)',
  },
  NO_SHOW: {
    label: 'No asistió',
    color: 'var(--status-noshow-color)',
    bg: 'var(--status-noshow-bg)',
    border: 'var(--status-noshow-border)',
  },
};
