import { afterEach, describe, expect, it } from 'vitest';
import { useBackofficeAuthStore } from './backofficeAuthStore';

const STORAGE_KEY = 'agendya-backoffice-auth';

const user = {
  id: 'internal-1',
  email: 'staff@agendya.test',
  name: 'Staff Member',
  role: 'SUPPORT' as const,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

afterEach(() => {
  useBackofficeAuthStore.getState().logout();
  window.localStorage.clear();
});

describe('useBackofficeAuthStore', () => {
  it('persists under its own storage key, separate from the professional auth store', () => {
    useBackofficeAuthStore.getState().setSession({ accessToken: 'token-1', user });

    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    // The customer-facing store uses `agendya-auth` — this store must never
    // read or write that key, so a staff session and a professional session
    // in the same browser can't collide.
    expect(window.localStorage.getItem('agendya-auth')).toBeNull();
  });

  it('clears the session on logout', () => {
    useBackofficeAuthStore.getState().setSession({ accessToken: 'token-1', user });
    useBackofficeAuthStore.getState().logout();

    expect(useBackofficeAuthStore.getState().accessToken).toBeNull();
    expect(useBackofficeAuthStore.getState().user).toBeNull();
  });
});
