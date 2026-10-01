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
  // Back to a fresh page load's initial state.
  useBackofficeAuthStore.setState({ accessToken: null, user: null, remember: true });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('useBackofficeAuthStore', () => {
  it('persists under its own storage key, separate from the professional auth store', () => {
    useBackofficeAuthStore
      .getState()
      .setSession({ accessToken: 'token-1', user });

    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    // The customer-facing store uses `agendya-auth` — this store must never
    // read or write that key, so a staff session and a professional session
    // in the same browser can't collide.
    expect(window.localStorage.getItem('agendya-auth')).toBeNull();
  });

  it('clears the session on logout', () => {
    useBackofficeAuthStore
      .getState()
      .setSession({ accessToken: 'token-1', user });
    useBackofficeAuthStore.getState().logout();

    expect(useBackofficeAuthStore.getState().accessToken).toBeNull();
    expect(useBackofficeAuthStore.getState().user).toBeNull();
  });

  it('keeps a remembered session in localStorage (survives closing the browser)', () => {
    useBackofficeAuthStore.getState().setSession({ accessToken: 'token-1', user }, true);

    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('token-1');
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps a non-remembered session only in sessionStorage', () => {
    useBackofficeAuthStore.getState().setSession({ accessToken: 'token-1', user }, true);
    useBackofficeAuthStore.getState().setSession({ accessToken: 'token-2', user }, false);

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toContain('token-2');
    // Switching to "don't remember" also removes the old persistent copy.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('treats a session saved before "Recordarme" existed as remembered', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { accessToken: 'legacy', user }, version: 0 }),
    );
    await useBackofficeAuthStore.persist.rehydrate();
    expect(useBackofficeAuthStore.getState().accessToken).toBe('legacy');
    useBackofficeAuthStore.setState({ user: { ...user, name: 'Renamed' } });

    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('Renamed');
  });
});
