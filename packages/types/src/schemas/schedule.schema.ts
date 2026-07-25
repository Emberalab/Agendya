import { z } from 'zod';

export const WEEKDAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export const weekdaySchema = z.enum(WEEKDAYS);

export type Weekday = z.infer<typeof weekdaySchema>;

const workingHourEntrySchema = z
  .object({
    dayOfWeek: weekdaySchema,
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((entry) => entry.endMinute > entry.startMinute, {
    message: 'La hora de cierre debe ser posterior a la de apertura.',
    path: ['endMinute'],
  });

export const setWorkingHoursSchema = z.object({
  days: z
    .array(workingHourEntrySchema)
    .max(7)
    .refine(
      (days) => new Set(days.map((day) => day.dayOfWeek)).size === days.length,
      {
        message: 'No puedes repetir el mismo día dos veces.',
      },
    ),
});

export type SetWorkingHoursInput = z.infer<typeof setWorkingHoursSchema>;

export const workingHourSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: weekdaySchema,
  startMinute: z.number(),
  endMinute: z.number(),
});

export type WorkingHour = z.infer<typeof workingHourSchema>;

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida, usa el formato AAAA-MM-DD.');

export const createScheduleExceptionSchema = z.object({
  date: dateOnlySchema,
  reason: z.string().trim().max(200).nullable().optional(),
});

export type CreateScheduleExceptionInput = z.infer<
  typeof createScheduleExceptionSchema
>;

export const scheduleExceptionSchema = z.object({
  id: z.string().uuid(),
  date: dateOnlySchema,
  reason: z.string().nullable(),
});

export type ScheduleException = z.infer<typeof scheduleExceptionSchema>;

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  date: dateOnlySchema,
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const availabilityResponseSchema = z.object({
  slots: z.array(z.string()),
});

export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;
