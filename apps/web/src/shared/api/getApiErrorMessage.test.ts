import { describe, expect, it } from 'vitest';
import { ApiError } from './apiClient';
import { getApiErrorMessage, isWaitlistRequiredError } from './getApiErrorMessage';

describe('getApiErrorMessage', () => {
  it('returns a plain string message as-is', () => {
    const error = new ApiError(400, { message: 'Ese horario ya no está disponible.' });
    expect(getApiErrorMessage(error)).toBe('Ese horario ya no está disponible.');
  });

  it('joins an array message', () => {
    const error = new ApiError(400, { message: ['Uno.', 'Dos.'] });
    expect(getApiErrorMessage(error)).toBe('Uno. Dos.');
  });

  // `ZodValidationPipe` always replies with a generic `message: 'Validation
  // failed'` and puts the real reason under `errors.fieldErrors` — this is
  // the shape that was leaving the public booking wizard's confirm step
  // showing "Validation failed" with no indication the address was too long.
  it('prefers the zod fieldErrors reason over the generic top-level message', () => {
    const error = new ApiError(400, {
      message: 'Validation failed',
      errors: {
        formErrors: [],
        fieldErrors: {
          customerAddress: ['Too big: expected string to have <=200 character(s)'],
        },
      },
    });
    expect(getApiErrorMessage(error)).toBe(
      'Too big: expected string to have <=200 character(s)',
    );
  });

  it('combines formErrors and every field\'s fieldErrors when several fields fail', () => {
    const error = new ApiError(400, {
      message: 'Validation failed',
      errors: {
        formErrors: ['Falta información.'],
        fieldErrors: {
          customerAddress: ['Dirección muy larga.'],
          customerPhone: ['Teléfono inválido.'],
        },
      },
    });
    expect(getApiErrorMessage(error)).toBe(
      'Falta información. Dirección muy larga. Teléfono inválido.',
    );
  });

  it('falls back to the generic message when errors carries nothing usable', () => {
    const error = new ApiError(400, {
      message: 'Validation failed',
      errors: { formErrors: [], fieldErrors: {} },
    });
    expect(getApiErrorMessage(error)).toBe('Validation failed');
  });

  it('falls back to the default message for a non-ApiError', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe(
      'Ocurrió un error. Intenta de nuevo.',
    );
  });

  it('supports a custom fallback', () => {
    expect(getApiErrorMessage(new Error('boom'), 'Otro error.')).toBe(
      'Otro error.',
    );
  });
});

describe('isWaitlistRequiredError', () => {
  it('detects the waitlist code', () => {
    const error = new ApiError(403, { code: 'WAITLIST_REQUIRED' });
    expect(isWaitlistRequiredError(error)).toBe(true);
  });

  it('is false for an unrelated 403', () => {
    const error = new ApiError(403, { message: 'Forbidden' });
    expect(isWaitlistRequiredError(error)).toBe(false);
  });
});
