import type { TicketCategory } from '@agendya/types';

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  APPOINTMENTS: 'Citas',
  SCHEDULE: 'Horario',
  AVAILABILITY: 'Disponibilidad',
  NOTIFICATIONS: 'Notificaciones',
  ACCOUNT: 'Cuenta',
  LOGIN: 'Inicio de sesión',
  PAYMENTS: 'Pagos',
  BUG: 'Error / bug',
  PERFORMANCE: 'Rendimiento',
  OTHER: 'Otro',
};
