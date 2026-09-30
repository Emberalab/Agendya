import { z } from 'zod';

/**
 * Agendya Backoffice — internal staff identity. Deliberately a separate
 * identity from `Professional` (barbers/stylists): internal staff are not
 * customers of the platform, so they get their own table, their own JWT, and
 * their own least-privilege roles instead of a flag on the customer model.
 *
 * Least privilege, in order:
 *   READ_ONLY   — view everything, mutate nothing.
 *   SUPPORT     — view + work tickets (reply, note, status, priority),
 *                 assign tickets to themselves only.
 *   ADMIN       — everything SUPPORT can, plus reassign any ticket.
 *   SUPER_ADMIN — everything ADMIN can, plus manage internal users.
 */
export const INTERNAL_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT',
  'READ_ONLY',
] as const;

export const internalRoleSchema = z.enum(INTERNAL_ROLES);
export type InternalRole = z.infer<typeof internalRoleSchema>;

export const internalUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: internalRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InternalUser = z.infer<typeof internalUserSchema>;

/** Minimal shape embedded in tickets/audit rows — never the full user. */
export const internalUserSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

export type InternalUserSummary = z.infer<typeof internalUserSummarySchema>;

export const createInternalUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('El correo no es válido.'),
  name: z.string().trim().min(2).max(100),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(100),
  role: internalRoleSchema,
});

export type CreateInternalUserInput = z.infer<typeof createInternalUserSchema>;

export const updateInternalUserRoleSchema = z.object({
  role: internalRoleSchema,
});

export type UpdateInternalUserRoleInput = z.infer<
  typeof updateInternalUserRoleSchema
>;

export const updateInternalUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateInternalUserStatusInput = z.infer<
  typeof updateInternalUserStatusSchema
>;
