import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Theme } from './themeStore';

const STORAGE_KEY = 'agendya-theme';

/**
 * Replaces `window.matchMedia('(prefers-color-scheme: dark)')` with a fake
 * that supports both the modern `addEventListener` API and the legacy
 * `addListener` one, and exposes `fireChange` to simulate the OS switching
 * appearance while the app is open.
 */
function mockMatchMedia(prefersDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (
      _event: string,
      cb: (event: MediaQueryListEvent) => void,
    ) => listeners.add(cb),
    removeEventListener: (
      _event: string,
      cb: (event: MediaQueryListEvent) => void,
    ) => listeners.delete(cb),
    addListener: (cb: (event: MediaQueryListEvent) => void) =>
      listeners.add(cb),
    removeListener: (cb: (event: MediaQueryListEvent) => void) =>
      listeners.delete(cb),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue(mql as unknown as MediaQueryList),
  );
  return {
    fireChange(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
  };
}

function seedManualTheme(theme: Theme | null) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ state: { manualTheme: theme }, version: 0 }),
  );
}

/** Fresh module evaluation, so its module-scope hydration/listener setup reruns. */
async function loadStore() {
  const mod = await import('./themeStore');
  return mod.useThemeStore;
}

describe('themeStore', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows a light OS preference when no manual choice exists', async () => {
    mockMatchMedia(false);
    const useThemeStore = await loadStore();

    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().manualTheme).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('follows a dark OS preference when no manual choice exists', async () => {
    mockMatchMedia(true);
    const useThemeStore = await loadStore();

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(
      true,
    );
  });

  it('a manual light choice overrides a dark OS preference', async () => {
    mockMatchMedia(true);
    seedManualTheme('light');
    const useThemeStore = await loadStore();

    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('a manual dark choice overrides a light OS preference', async () => {
    mockMatchMedia(false);
    seedManualTheme('dark');
    const useThemeStore = await loadStore();

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('persists an explicit choice across a reload', async () => {
    mockMatchMedia(false);
    const useThemeStore = await loadStore();

    useThemeStore.getState().setTheme('dark');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.state.manualTheme).toBe('dark');

    const reloadedStore = await loadStore();
    expect(reloadedStore.getState().theme).toBe('dark');
    expect(reloadedStore.getState().manualTheme).toBe('dark');
  });

  it('clearing the manual preference returns to the OS preference', async () => {
    mockMatchMedia(true);
    seedManualTheme('light');
    const useThemeStore = await loadStore();
    expect(useThemeStore.getState().theme).toBe('light');

    useThemeStore.getState().useSystemTheme();

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().manualTheme).toBeNull();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.state.manualTheme).toBeNull();
  });

  it('reacts live to an OS preference change when no manual choice was made', async () => {
    const media = mockMatchMedia(false);
    const useThemeStore = await loadStore();
    expect(useThemeStore.getState().theme).toBe('light');

    media.fireChange(true);

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('ignores an OS preference change once a manual choice has been made', async () => {
    const media = mockMatchMedia(false);
    const useThemeStore = await loadStore();
    useThemeStore.getState().setTheme('light');

    media.fireChange(true);

    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('toggleTheme still sets an explicit manual preference', async () => {
    mockMatchMedia(false);
    const useThemeStore = await loadStore();

    useThemeStore.getState().toggleTheme();

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().manualTheme).toBe('dark');
  });
});
