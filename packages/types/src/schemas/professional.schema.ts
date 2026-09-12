import { z } from 'zod';
import { planSchema } from '../plans/catalog';

export const CANCELLATION_POLICY_HOURS_OPTIONS = [1, 2, 3, 4, 6, 24] as const;

export const cancellationPolicyHoursSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(6),
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

/** Any 6-digit hex colour, e.g. `#4F46E5`. */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color hexadecimal, por ejemplo #4F46E5.');

/** Suggested quick-pick swatches shown under the colour slider. */
export const BRAND_COLOR_PRESETS = [
  '#4F46E5',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#0F172A',
] as const;

/**
 * An http(s) URL. Plain `z.string().url()` also accepts schemes like
 * `javascript:` or `data:` (the WHATWG URL parser it's built on treats them
 * as valid URLs) — harmless for the current `<img src>` rendering of these
 * fields, but worth closing off at the schema level as defense in depth
 * against a future `<a href>`/redirect use.
 */
const httpUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => /^https?:\/\//i.test(value),
    'La URL debe empezar por http:// o https://.',
  );

export const updateProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(100).optional(),
  slug: slugSchema.optional(),
  category: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  photoUrl: httpUrlSchema.nullable().optional(),
  logoUrl: httpUrlSchema.nullable().optional(),
  coverImageUrl: httpUrlSchema.nullable().optional(),
  brandColor: hexColorSchema.optional(),
  timezone: z.string().min(1).optional(),
  cancellationPolicyHours: cancellationPolicyHoursSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const professionalProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  slug: z.string(),
  category: z.string().nullable(),
  photoUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  brandColor: z.string().nullable(),
  description: z.string().nullable(),
  timezone: z.string(),
  cancellationPolicyHours: z.number(),
  plan: planSchema,
  /** Non-cancelled bookings created in the current calendar month. */
  bookingsThisMonth: z.number(),
  /** Non-deleted services — used for plan upsell, not a second list fetch. */
  serviceCount: z.number(),
  /** Monthly booking allowance for the current plan; `null` means unlimited. */
  monthlyBookingLimit: z.number().nullable(),
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
  description: z.string().nullable(),
  durationMinutes: z.number(),
  priceCents: z.number(),
  homeServiceEnabled: z.boolean(),
  homeDurationMinutes: z.number().nullable(),
  homePriceCents: z.number().nullable(),
});

export type PublicService = z.infer<typeof publicServiceSchema>;

export const publicProfessionalSchema = z.object({
  businessName: z.string(),
  slug: z.string(),
  category: z.string().nullable(),
  photoUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  brandColor: z.string().nullable(),
  description: z.string().nullable(),
  services: z.array(publicServiceSchema),
});

export type PublicProfessional = z.infer<typeof publicProfessionalSchema>;
