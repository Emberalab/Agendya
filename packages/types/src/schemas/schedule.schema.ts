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

/** Max blocks per weekday, matching the editor UI. */
export const MAX_BLOCKS_PER_DAY = 6;

export const setWorkingHoursSchema = z.object({
  // A weekday may appear more than once: each entry is one working block. Blocks
  // for the same day must not overlap.
  days: z
    .array(workingHourEntrySchema)
    .max(7 * MAX_BLOCKS_PER_DAY)
    .superRefine((days, ctx) => {
      const byDay = new Map<string, typeof days>();
      days.forEach((entry) => {
        const list = byDay.get(entry.dayOfWeek) ?? [];
        list.push(entry);
        byDay.set(entry.dayOfWeek, list);
      });

      for (const [dayOfWeek, blocks] of byDay) {
        if (blocks.length > MAX_BLOCKS_PER_DAY) {
          ctx.addIssue({
            code: 'custom',
            message: `Máximo ${MAX_BLOCKS_PER_DAY} bloques por día.`,
          });
        }
        const sorted = [...blocks].sort(
          (a, b) => a.startMinute - b.startMinute,
        );
        for (let i = 1; i < sorted.length; i += 1) {
          if (sorted[i].startMinute < sorted[i - 1].endMinute) {
            ctx.addIssue({
              code: 'custom',
              message: `Los bloques de ${dayOfWeek} se superponen.`,
            });
            break;
          }
        }
      }
    }),
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
  serviceIds: z.string().min(1), // Comma-separated UUIDs
  date: dateOnlySchema,
  // Query params arrive as strings; treat the literal "true" as at-home.
  atHome: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const availabilityResponseSchema = z.object({
  slots: z.array(z.string()),
});

export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;
