import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InternalUser } from '@agendya/types';

/**
 * Separate store, separate localStorage key (`agendya-backoffice-auth`) from
 * the customer-facing `useAuthStore` (`agendya-auth`). Deliberate: a staff
 * member and a professional session in the same browser must never collide,
 * and `backofficeApiClient` reads only from here — never from `useAuthStore`.
 */
interface BackofficeAuthState {
  accessToken: string | null;
  user: InternalUser | null;
  setSession: (session: { accessToken: string; user: InternalUser }) => void;
  logout: () => void;
}

export const useBackofficeAuthStore = create<BackofficeAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'agendya-backoffice-auth' },
  ),
);
