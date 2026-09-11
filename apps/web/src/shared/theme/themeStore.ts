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
  /** The theme actually applied to the document right now. Not persisted
   * directly — always derived as `manualTheme ?? OS preference`. */
  theme: Theme;
  /** The user's explicit choice via the toggle, or `null` if they've never
   * overridden the OS preference. Only this field is persisted. */
  manualTheme: Theme | null;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Clears the manual override and resumes following the OS preference. */
  useSystemTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Corrected synchronously below, once `persist`'s localStorage
      // hydration (see the comment after this call) has resolved the real
      // `manualTheme` — this initial guess only matters if hydration finds
      // nothing.
      theme: systemTheme(),
      manualTheme: null,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme, manualTheme: theme });
      },
      toggleTheme: () => {
        get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
      },
      useSystemTheme: () => {
        const theme = systemTheme();
        applyTheme(theme);
        set({ theme, manualTheme: null });
      },
    }),
    {
      name: STORAGE_KEY,
      // Only the explicit choice is persisted — `theme` is always derived,
      // so an OS-preference change on a later visit is picked up naturally
      // instead of replaying a stale value.
      partialize: (state) => ({ manualTheme: state.manualTheme }),
    },
  ),
);

// `persist`'s default (localStorage) storage hydrates synchronously, so by
// the time this module finishes evaluating, `manualTheme` already reflects
// any stored preference. `theme` itself isn't persisted and was computed by
// the creator above *before* that hydration ran, so recompute it now from
// the now-hydrated `manualTheme`. index.html's inline script already set the
// DOM attribute before first paint to avoid a flash; this keeps the store
// and the DOM in sync from here on (e.g. after a hot reload in dev).
{
  const theme = useThemeStore.getState().manualTheme ?? systemTheme();
  applyTheme(theme);
  useThemeStore.setState({ theme });
}

// React live to OS theme changes while the app stays open, but only while no
// explicit choice has been made — mirrors the same priority rule the toggle
// and index.html's pre-paint script apply. `addListener`/`removeListener`
// are deprecated but still what pre-14 Safari needs alongside the modern
// `addEventListener` API.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = (event: MediaQueryListEvent) => {
    if (useThemeStore.getState().manualTheme !== null) return;
    const theme: Theme = event.matches ? 'dark' : 'light';
    applyTheme(theme);
    useThemeStore.setState({ theme });
  };
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleSystemChange);
  } else if (typeof media.addListener === 'function') {
    media.addListener(handleSystemChange);
  }
}
