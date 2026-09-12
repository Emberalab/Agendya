import { describe, expect, it } from 'vitest';
import { isSuperAdmin, postAuthPath } from './postAuthPath';

describe('postAuthPath', () => {
  it('sends super admins to the empty dashboard home', () => {
    expect(isSuperAdmin({ role: 'SUPER_ADMIN' })).toBe(true);
    expect(postAuthPath({ role: 'SUPER_ADMIN' })).toBe('/dashboard');
  });

  it('does not treat an email alone as super admin', () => {
    expect(isSuperAdmin({ email: 'info@agendya.co' } as never)).toBe(false);
    expect(postAuthPath({ email: 'info@agendya.co' } as never)).toBe(
      '/dashboard/profile',
    );
  });

  it('sends everyone else to the professional profile', () => {
    expect(postAuthPath({ role: 'INDEPENDENT' })).toBe('/dashboard/profile');
    expect(postAuthPath(null)).toBe('/dashboard/profile');
  });
});
