import { describe, expect, it } from 'vitest';
import { registerSchema } from '@agendya/types';

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      businessName: 'María Belleza',
      email: 'maria@salon.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('explains when the email field is not an email', () => {
    const result = registerSchema.safeParse({
      businessName: 'María Belleza',
      email: 'AgendyaSuperAdmin',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.flatten().fieldErrors.email?.[0]).toMatch(
      /nombre@empresa\.com/,
    );
  });

  it('guides the user when the business name looks like an email', () => {
    const result = registerSchema.safeParse({
      businessName: 'info@agendya.co',
      email: 'AgendyaSuperAdmin',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    const { businessName, email } = result.error.flatten().fieldErrors;
    expect(businessName?.[0]).toMatch(/parece un correo/);
    expect(email?.[0]).toMatch(/Aquí va el correo/);
  });

  it('rejects emails that fail Zod email() such as a missing TLD', () => {
    const result = registerSchema.safeParse({
      businessName: 'María Belleza',
      email: 'user@localhost',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.flatten().fieldErrors.email?.[0]).toMatch(
      /nombre@empresa\.com/,
    );
  });
});
