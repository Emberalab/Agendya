import type { BookingStatus } from '@agendya/types';

export const STATUS_CFG: Record<BookingStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'Pendiente', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  CONFIRMED: { label: 'Confirmada', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0' },
  CANCELLED: { label: 'Cancelada', color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
  COMPLETED: { label: 'Completada', color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
  NO_SHOW: { label: 'No asistió', color: '#EF4444', bg: '#FFF1F2', border: '#FECDD3' },
};
