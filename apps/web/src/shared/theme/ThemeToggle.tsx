import { useThemeStore } from './themeStore';

/**
 * Light/dark switch — same visual design (and hosted artwork) as the toggle
 * used on emberalab.com, adapted to this app's `data-theme` mechanism and to
 * the accessible `role="switch"` button pattern already used by
 * `modules/services/components/Toggle.tsx`. The emberalab artwork is just the
 * track; the sliding knob below is added here so the on/off position reads
 * clearly. Shared (not under `modules/dashboard`) because both the
 * authenticated dashboard and the public booking page use it.
 */
export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      onClick={toggleTheme}
      className="agendia-theme-toggle"
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '3px',
          left: isDark ? '34px' : '3px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-text-on-brand)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
