import { z } from 'zod';
import { BILLING_INTERVALS } from '../plans/billing';
import { planSchema } from '../plans/catalog';

// PlatformAccessEmail CRUD schemas

export const platformAccessKindSchema = z.enum(['SUPER_ADMIN', 'ALLOWLISTED']);
export type PlatformAccessKind = z.infer<typeof platformAccessKindSchema>;

export const createAllowlistEntrySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('El correo no es válido.'),
  access: platformAccessKindSchema,
});

export type CreateAllowlistEntryInput = z.infer<typeof createAllowlistEntrySchema>;

export const updateAllowlistEntrySchema = z.object({
  access: platformAccessKindSchema,
});

export type UpdateAllowlistEntryInput = z.infer<typeof updateAllowlistEntrySchema>;

export const allowlistEntrySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  access: platformAccessKindSchema,
  createdAt: z.string().datetime(),
  /** Null when the email is allowlisted but has not registered yet. */
  plan: planSchema.nullable(),
  billingInterval: z.enum(BILLING_INTERVALS).nullable(),
  planStartedAt: z.string().datetime().nullable(),
  planExpiresAt: z.string().datetime().nullable(),
});

export type AllowlistEntry = z.infer<typeof allowlistEntrySchema>;

// Plan change schemas

export const changeProfessionalPlanSchema = z.object({
  plan: planSchema,
});

export type ChangeProfessionalPlanInput = z.infer<typeof changeProfessionalPlanSchema>;

export const professionalForPlanChangeSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  slug: z.string(),
  plan: planSchema,
  billingInterval: z.enum(BILLING_INTERVALS).nullable(),
  planExpiresAt: z.string().datetime().nullable(),
});

export type ProfessionalForPlanChange = z.infer<typeof professionalForPlanChangeSchema>;
