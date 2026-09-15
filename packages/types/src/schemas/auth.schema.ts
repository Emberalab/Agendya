import { z } from 'zod';

export const platformRoleSchema = z.enum([
  'SUPER_ADMIN',
  'BUSINESS_ADMIN',
  'INDEPENDENT',
]);

export type PlatformRole = z.infer<typeof platformRoleSchema>;

export const ACCESS_STATUSES = ['PENDING', 'APPROVED', 'DECLINED'] as const;

export const accessStatusSchema = z.enum(ACCESS_STATUSES);

export type AccessStatus = z.infer<typeof accessStatusSchema>;

export const ACCESS_STATUS_LABELS: Record<AccessStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  DECLINED: 'Declinado',
};

const EMAIL_MESSAGE =
  'Eso no parece un correo. Escríbelo como nombre@empresa.com.';

const zodEmail = z.string().email();

function isZodEmail(value: string): boolean {
  return zodEmail.safeParse(value).success;
}

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Escribe tu correo electrónico.'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .max(72, 'La contraseña no puede tener más de 72 caracteres.'),
    businessName: z
      .string()
      .trim()
      .min(2, 'Escribe el nombre de tu negocio (mínimo 2 caracteres).')
      .max(100, 'El nombre del negocio no puede tener más de 100 caracteres.'),
  })
  .superRefine((data, ctx) => {
    const businessLooksLikeEmail = isZodEmail(data.businessName);
    const emailIsValid = isZodEmail(data.email);

    if (businessLooksLikeEmail) {
      ctx.addIssue({
        code: 'custom',
        path: ['businessName'],
        message:
          'Esto parece un correo. Ponlo en «Correo electrónico» y aquí el nombre de tu negocio.',
      });
    }

    if (!emailIsValid) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: businessLooksLikeEmail
          ? 'Aquí va el correo (el de arriba parece uno). Ejemplo: nombre@empresa.com.'
          : EMAIL_MESSAGE,
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Escribe tu correo electrónico.')
    .email(EMAIL_MESSAGE),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string(),
  slug: z.string(),
  role: platformRoleSchema,
  accessStatus: accessStatusSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Login with an email that has no Professional row — the web offers a register CTA. */
export const ACCOUNT_NOT_FOUND_CODE = 'ACCOUNT_NOT_FOUND';

/** The account exists but Super Admin declined access. */
export const ACCESS_DECLINED_CODE = 'ACCESS_DECLINED';
