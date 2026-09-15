import type { TicketPriority, TicketStatus } from '@agendya/types';
import { Badge, type BadgeVariant } from '../../../shared/components/Badge';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  WAITING_FOR_CUSTOMER: 'Esperando al profesional',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

// A "semáforo" scale reused for both status and priority below — gray (calm)
// → brand blue (normal/active) → amber (needs attention) → red (urgent) —
// plus green reserved for the one state priority never reaches: done.
// OPEN and WAITING_FOR_CUSTOMER used to share the same amber, which read as
// the same chip at a glance; OPEN (nobody has looked at it yet) now gets the
// more urgent red, leaving amber for "we've responded, ball's in the
// professional's court".
const STATUS_VARIANTS: Record<TicketStatus, BadgeVariant> = {
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

const PRIORITY_VARIANTS: Record<TicketPriority, BadgeVariant> = {
  LOW: 'secondary',
  NORMAL: 'default',
  HIGH: 'warning',
  URGENT: 'danger',
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={PRIORITY_VARIANTS[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}

export { STATUS_LABELS as TICKET_STATUS_LABELS, PRIORITY_LABELS as TICKET_PRIORITY_LABELS };
