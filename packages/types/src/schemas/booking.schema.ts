import { z } from 'zod';
import { dateOnlySchema } from './schedule.schema';

export const BOOKING_STATUSES = [
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const createBookingSchema = z.object({
  serviceIds: z.string().min(1), // Comma-separated UUIDs
  startAt: z.string().datetime(),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().toLowerCase().email(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Ingresa un teléfono válido.'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

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
  startAt: z.string(),
  endAt: z.string(),
  status: bookingStatusSchema,
  cancellationToken: z.string(),
  cancellationPolicyHours: z.number(),
  canCancel: z.boolean(),
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
  startAt: z.string(),
  endAt: z.string(),
  status: bookingStatusSchema,
  cancellationPolicyHours: z.number(),
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
