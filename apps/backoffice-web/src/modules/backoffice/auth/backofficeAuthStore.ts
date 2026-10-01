import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import type { InternalUser } from '@agendya/types';

/**
 * Separate store, separate storage key (`agendya-backoffice-auth`) from the
 * customer-facing `useAuthStore` (`agendya-auth`). Deliberate: a staff
 * member and a professional session in the same browser must never collide,
 * and `backofficeApiClient` reads only from here — never from `useAuthStore`.
 *
 * "Recordarme" decides *where* the session lives:
 *  - remembered → localStorage: survives closing the browser (until the
 *    token expires).
 *  - not remembered → sessionStorage: gone when the browser closes. New tabs
 *    still get the session from an open tab via `sessionSync.ts`, so
 *    opening a ticket in a new tab doesn't log the agent out.
 */
export const BACKOFFICE_AUTH_STORAGE_KEY = 'agendya-backoffice-auth';

interface BackofficeAuthState {
  accessToken: string | null;
  user: InternalUser | null;
  remember: boolean;
  setSession: (
    session: { accessToken: string; user: InternalUser },
    remember?: boolean,
  ) => void;
  logout: () => void;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback; // storage blocked (privacy mode, embedded previews…)
  }
}

/** Reads from either storage; writes to the one `remember` selects. */
export const rememberAwareStorage: StateStorage = {
  getItem: (name) =>
    safe(
      () =>
        window.localStorage.getItem(name) ??
        window.sessionStorage.getItem(name),
      null,
    ),
  setItem: (name, value) =>
    safe(() => {
      // Sessions persisted before "Recordarme" existed have no flag; they
      // were always remembered, so keep them that way.
      const remember =
        (JSON.parse(value) as { state?: { remember?: boolean } }).state
          ?.remember !== false;
      const [target, other] = remember
        ? [window.localStorage, window.sessionStorage]
        : [window.sessionStorage, window.localStorage];
      target.setItem(name, value);
      other.removeItem(name);
    }, undefined),
  removeItem: (name) =>
    safe(() => {
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
    }, undefined),
};

export const useBackofficeAuthStore = create<BackofficeAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      remember: true,
      setSession: ({ accessToken, user }, remember = true) =>
        set({ accessToken, user, remember }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: BACKOFFICE_AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => rememberAwareStorage),
    },
  ),
);
