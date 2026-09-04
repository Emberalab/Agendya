import { z } from 'zod';

/** Duration choices (minutes) offered in the service form selects. */
export const SERVICE_DURATION_OPTIONS = [
  15, 20, 30, 40, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300, 360, 420,
  480,
] as const;

const nameSchema = z.string().trim().min(2).max(100);
const descriptionSchema = z.string().trim().max(500);
const durationSchema = z.number().int().min(5).max(480);
// Prices are stored as integer minor units (e.g. COP cents). 100_000_000 = $1,000,000.
const priceSchema = z.number().int().min(0).max(100_000_000);

const homeServiceRefinement = (
  data: {
    homeServiceEnabled?: boolean;
    homeDurationMinutes?: number | null;
    homePriceCents?: number | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (!data.homeServiceEnabled) return;
  if (data.homeDurationMinutes == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['homeDurationMinutes'],
      message: 'Indica la duración a domicilio.',
    });
  }
  if (data.homePriceCents == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['homePriceCents'],
      message: 'Indica el precio a domicilio.',
    });
  }
};

export const createServiceSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema.nullable().optional(),
    durationMinutes: durationSchema,
    priceCents: priceSchema,
    isActive: z.boolean().optional().default(true),
    homeServiceEnabled: z.boolean().optional().default(false),
    homeDurationMinutes: durationSchema.nullable().optional(),
    homePriceCents: priceSchema.nullable().optional(),
  })
  .superRefine(homeServiceRefinement);

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    durationMinutes: durationSchema.optional(),
    priceCents: priceSchema.optional(),
    isActive: z.boolean().optional(),
    homeServiceEnabled: z.boolean().optional(),
    homeDurationMinutes: durationSchema.nullable().optional(),
    homePriceCents: priceSchema.nullable().optional(),
  })
  .superRefine(homeServiceRefinement);

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const serviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number(),
  priceCents: z.number(),
  isActive: z.boolean(),
  homeServiceEnabled: z.boolean(),
  homeDurationMinutes: z.number().nullable(),
  homePriceCents: z.number().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Service = z.infer<typeof serviceSchema>;
