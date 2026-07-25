import { z } from 'zod';

export const CANCELLATION_POLICY_HOURS_OPTIONS = [2, 6, 12, 24] as const;

export const cancellationPolicyHoursSchema = z.union([
  z.literal(2),
  z.literal(6),
  z.literal(12),
  z.literal(24),
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(50)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'El enlace solo puede contener letras minúsculas, números y guiones.',
  );

export const updateProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(100).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  timezone: z.string().min(1).optional(),
  cancellationPolicyHours: cancellationPolicyHoursSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const professionalProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  slug: z.string(),
  photoUrl: z.string().nullable(),
  description: z.string().nullable(),
  timezone: z.string(),
  cancellationPolicyHours: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;

export const checkSlugQuerySchema = z.object({
  slug: slugSchema,
});

export type CheckSlugQuery = z.infer<typeof checkSlugQuerySchema>;

export const checkSlugResponseSchema = z.object({
  available: z.boolean(),
});

export type CheckSlugResponse = z.infer<typeof checkSlugResponseSchema>;

export const publicServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  durationMinutes: z.number(),
});

export type PublicService = z.infer<typeof publicServiceSchema>;

export const publicProfessionalSchema = z.object({
  businessName: z.string(),
  slug: z.string(),
  photoUrl: z.string().nullable(),
  description: z.string().nullable(),
  services: z.array(publicServiceSchema),
});

export type PublicProfessional = z.infer<typeof publicProfessionalSchema>;
