import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@agendya/types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (session: { accessToken: string; user: AuthUser }) => void;
  /**
   * Merges a partial update into the cached `user` (e.g. after saving the
   * profile form) without touching the token. `user` is only ever set here
   * at login (see `setSession` callers) — nothing else kept it in sync with
   * later edits, so the sidebar/top-bar initial and business name could go
   * stale (or, for a Google sign-up that started with an empty
   * `businessName`, stay permanently blank) even after the professional
   * saved a real one on the Profile page. No-ops if the user is logged out.
   */
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'agendya-auth' },
  ),
);
