import { z } from 'zod';
import { BILLING_INTERVALS } from '../plans/billing';
import { planSchema } from '../plans/catalog';
import { TRIAL_MAX_EXTENSION_DAYS, trialInfoSchema } from '../plans/trial';
import { accessStatusSchema, platformRoleSchema } from './auth.schema';

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

// Type-ahead account search (Super Admin "Plan y prueba" tab).

/** Characters typed before the search runs, client and server. */
export const ADMIN_SEARCH_MIN_CHARS = 3;
export const ADMIN_SEARCH_LIMIT = 10;

export const searchProfessionalsQuerySchema = z.object({
  q: z.string().trim().min(ADMIN_SEARCH_MIN_CHARS).max(100),
});
export type SearchProfessionalsQuery = z.infer<
  typeof searchProfessionalsQuerySchema
>;

export const professionalSearchResultSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  plan: planSchema,
  /** Server-computed: a full-access trial is active right now. */
  trialActive: z.boolean(),
});
export type ProfessionalSearchResult = z.infer<
  typeof professionalSearchResultSchema
>;

// Trial management (Super Admin). The client never sends dates: the grant
// length is TRIAL_DURATION_DAYS server-side, and an extension is a bounded
// number of days added to the current end.

export const TRIAL_EVENT_ACTIONS = ['GRANTED', 'EXTENDED', 'ENDED'] as const;
export const trialEventActionSchema = z.enum(TRIAL_EVENT_ACTIONS);
export type TrialEventAction = z.infer<typeof trialEventActionSchema>;

const trialNoteSchema = z.string().trim().max(200).optional();

export const grantTrialSchema = z.object({
  /**
   * Explicit admin override to grant a second trial to an account that
   * already used one. Without it a repeat grant is rejected.
   */
  allowRepeat: z.boolean().optional(),
  note: trialNoteSchema,
});
export type GrantTrialInput = z.infer<typeof grantTrialSchema>;

export const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(TRIAL_MAX_EXTENSION_DAYS),
  note: trialNoteSchema,
});
export type ExtendTrialInput = z.infer<typeof extendTrialSchema>;

export const endTrialSchema = z.object({
  note: trialNoteSchema,
});
export type EndTrialInput = z.infer<typeof endTrialSchema>;

export const trialEventSchema = z.object({
  id: z.string().uuid(),
  action: trialEventActionSchema,
  actorEmail: z.string().email(),
  previousEndsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type TrialEvent = z.infer<typeof trialEventSchema>;

export const professionalForPlanChangeSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  slug: z.string(),
  plan: planSchema,
  billingInterval: z.enum(BILLING_INTERVALS).nullable(),
  planExpiresAt: z.string().datetime().nullable(),
  /** Plan whose limits apply now (trial-aware). Computed server-side. */
  effectivePlan: planSchema,
  trial: trialInfoSchema.nullable(),
  /** Newest first. */
  trialHistory: z.array(trialEventSchema),
});

export type ProfessionalForPlanChange = z.infer<typeof professionalForPlanChangeSchema>;

export const registrationEntrySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  slug: z.string(),
  accessStatus: accessStatusSchema,
  role: platformRoleSchema,
  plan: planSchema,
  /** Full-access trial, if ever granted. `active` is server-computed. */
  trial: trialInfoSchema.nullable(),
  createdAt: z.string().datetime(),
});

export type RegistrationEntry = z.infer<typeof registrationEntrySchema>;

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(['APPROVED', 'DECLINED']),
});

export type UpdateRegistrationStatusInput = z.infer<
  typeof updateRegistrationStatusSchema
>;
