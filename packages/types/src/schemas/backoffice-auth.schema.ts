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
