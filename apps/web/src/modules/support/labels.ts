import type { TicketCategory, TicketStatus } from '@agendya/types';

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  APPOINTMENTS: 'Citas',
  SCHEDULE: 'Horario',
  AVAILABILITY: 'Disponibilidad',
  NOTIFICATIONS: 'Notificaciones',
  ACCOUNT: 'Cuenta',
  LOGIN: 'Inicio de sesión',
  PAYMENTS: 'Pagos',
  BUG: 'Error / falla',
  PERFORMANCE: 'Rendimiento',
  OTHER: 'Otro',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  WAITING_FOR_CUSTOMER: 'Esperando tu respuesta',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};
