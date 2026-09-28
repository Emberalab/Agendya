import { z } from 'zod';

/**
 * Slugs reserved for application routes and features. These cannot be used
 * as professional slugs to avoid routing conflicts.
 */
export const RESERVED_SLUGS = [
  'terminos',
  'privacidad',
  'login',
  'register',
  'dashboard',
  'bookings',
  'auth',
  'acceso-pendiente',
  'forgot-password',
  'reset-password',
  'api',
  'admin',
] as const;

/**
 * Validates that a slug is not reserved.
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug as (typeof RESERVED_SLUGS)[number]);
}

/**
 * Schema for validating professional slugs.
 */
export const slugSchema = z
  .string()
  .min(1, 'El slug no puede estar vacío')
  .max(50, 'El slug no puede tener más de 50 caracteres')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug solo puede contener letras minúsculas, números y guiones')
  .refine(
    (slug) => !isReservedSlug(slug),
    {
      message: 'Este slug está reservado por el sistema. Por favor elige otro.',
    },
  );
