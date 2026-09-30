import { useThemeStore } from './themeStore';

/**
 * Light/dark switch — same visual design, artwork and `data-theme` mechanism
 * as apps/web's `shared/theme/ThemeToggle.tsx`, so the Backoffice's theme
 * behavior isn't a second system a staff member has to learn.
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
          backgroundColor: 'var(--color-on-brand)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
