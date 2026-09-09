import { z } from 'zod';
import { dateOnlySchema } from './schedule.schema';

export const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
  'EXPIRED',
] as const;

export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

// Kept as a plain object (not wrapped in .superRefine) so consumers can still
// `.pick()` fields from it. The `atHome` + `customerAddress` dependency is
// enforced in the booking service and the public booking wizard.
export const createBookingSchema = z.object({
  serviceIds: z.string().min(1), // Comma-separated UUIDs
  startAt: z.string().datetime(),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().toLowerCase().email(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Ingresa un teléfono válido.'),
  customerNote: z.string().trim().max(500).optional(),
  atHome: z.boolean().optional().default(false),
  customerAddress: z.string().trim().min(5).max(200).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// A public booking edit accepts the same fields as a fresh booking: the customer
// can change the service, modality, date/time, and their contact details. The
// booking is looked up by its cancellation token, so no slug is needed here.
export const updateBookingSchema = createBookingSchema;

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export const publicBookingSchema = z.object({
  id: z.string().uuid(),
  businessName: z.string(),
  professionalSlug: z.string(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  durationMinutes: z.number(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string(),
  customerNote: z.string().nullable(),
  atHome: z.boolean(),
  customerAddress: z.string().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  status: bookingStatusSchema,
  cancellationToken: z.string(),
  cancellationPolicyHours: z.number(),
  canCancel: z.boolean(),
  canReschedule: z.boolean(),
});

export type PublicBooking = z.infer<typeof publicBookingSchema>;

export const agendaBookingSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  durationMinutes: z.number(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string(),
  customerNote: z.string().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  status: bookingStatusSchema,
  cancellationPolicyHours: z.number(),
  canReschedule: z.boolean(),
  createdAt: z.string(),
  cancelledAt: z.string().nullable(),
  cancelledBy: z.string().nullable(),
});

export type AgendaBooking = z.infer<typeof agendaBookingSchema>;

export const agendaQuerySchema = z.object({
  from: dateOnlySchema,
  to: dateOnlySchema,
});

export type AgendaQuery = z.infer<typeof agendaQuerySchema>;

export const rescheduleBookingSchema = z.object({
  newStartAt: z.string().datetime(),
});

export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
