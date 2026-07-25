import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  durationMinutes: z.number().int().min(5).max(480),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const serviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  durationMinutes: z.number(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Service = z.infer<typeof serviceSchema>;
