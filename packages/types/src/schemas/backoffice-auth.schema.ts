import { z } from 'zod';
import { internalUserSchema } from './internal-user.schema';

/**
 * Login for `InternalUser` (Agendya Backoffice staff). Deliberately not
 * reusing `auth.schema.ts` — that's the customer-facing (`Professional`)
 * login and issues a differently-scoped JWT.
 */
export const backofficeLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('El correo no es válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export type BackofficeLoginInput = z.infer<typeof backofficeLoginSchema>;

export const backofficeAuthResponseSchema = z.object({
  accessToken: z.string(),
  user: internalUserSchema,
});

export type BackofficeAuthResponse = z.infer<
  typeof backofficeAuthResponseSchema
>;

const staffEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Escribe tu correo electrónico.')
  .email('El correo no es válido.');

/** Same rules as `createInternalUserSchema.password`. */
export const backofficePasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(100, 'La contraseña no puede tener más de 100 caracteres.');

export const backofficeForgotPasswordSchema = z.object({ email: staffEmail });
export type BackofficeForgotPasswordInput = z.infer<
  typeof backofficeForgotPasswordSchema
>;

export const backofficeResetPasswordSchema = z.object({
  token: z.string().min(1, 'El enlace no es válido.'),
  password: backofficePasswordSchema,
});
export type BackofficeResetPasswordInput = z.infer<
  typeof backofficeResetPasswordSchema
>;

/** Reset link is unknown, already used, expired, or its account is inactive. */
export const BACKOFFICE_RESET_TOKEN_INVALID_CODE =
  'BACKOFFICE_RESET_TOKEN_INVALID';

/**
 * `?error=` values the Backoffice API appends to `/backoffice/login` when a
 * Google sign-in can't complete. The login page maps each to a message.
 */
export const BACKOFFICE_GOOGLE_ERRORS = [
  /** GOOGLE_CLIENT_ID/SECRET aren't configured on apps/backoffice-api. */
  'google_unavailable',
  /** No active staff account with this (verified) Google email. */
  'google_no_account',
  /** Email not verified by Google, or outside the allowed domains. */
  'google_not_allowed',
  /** State mismatch, user cancelled, or any other OAuth failure. */
  'google_failed',
] as const;
export type BackofficeGoogleError = (typeof BACKOFFICE_GOOGLE_ERRORS)[number];
