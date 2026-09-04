import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'agendya-theme';

function systemTheme(): Theme {
  // `matchMedia` is missing in jsdom (Vitest's test environment) and in any
  // environment that predates it, so this can't assume it exists just because
  // `window` does.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Applies the theme to the document so plain CSS (main.scss, Tailwind's
 * `dark:` variant) can react to it, and mirrors it onto Moon UI's own
 * `.dark-theme` class so Moon components (Button, Input, Select, Checkbox,
 * FormGroup) pick up Moon's matching dark palette. Kept in one place so the
 * two mechanisms never drift apart.
 */
function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark-theme', theme === 'dark');
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: systemTheme(),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
      },
    }),
    { name: STORAGE_KEY },
  ),
);

// `persist`'s default (localStorage) storage hydrates synchronously, so by the
// time this module finishes evaluating, `theme` already reflects any stored
// preference. Apply it once here — the inline snippet in index.html already
// set the attribute before paint to avoid a flash, this just keeps the store
// and the DOM in sync from here on (e.g. after a hot reload in dev).
applyTheme(useThemeStore.getState().theme);
