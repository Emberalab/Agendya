import type { TicketPriority, TicketStatus } from '@agendya/types';
import { Badge } from '../../../shared/components/Badge';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  WAITING_FOR_CUSTOMER: 'Esperando al profesional',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

const STATUS_VARIANTS: Record<
  TicketStatus,
  'default' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  OPEN: 'danger',
  IN_PROGRESS: 'default',
  WAITING_FOR_CUSTOMER: 'warning',
  RESOLVED: 'success',
  CLOSED: 'secondary',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const PRIORITY_VARIANTS: Record<
  TicketPriority,
  'default' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  LOW: 'secondary',
  NORMAL: 'default',
  HIGH: 'warning',
  URGENT: 'danger',
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANTS[priority]}>{PRIORITY_LABELS[priority]}</Badge>
  );
}

export { STATUS_LABELS as TICKET_STATUS_LABELS, PRIORITY_LABELS as TICKET_PRIORITY_LABELS };
