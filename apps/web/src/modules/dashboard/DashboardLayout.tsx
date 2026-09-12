import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { isSuperAdmin } from '../auth/postAuthPath';
import Group from '../../imports/LogoGroup';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '../../shared/theme/ThemeToggle';
import { NAV_ITEMS } from './navItems';
import { NavIcon } from './NavIcon';
import { ToastHost } from '../../shared/notifications/ToastHost';
import { Announcer } from '../../shared/a11y/announcer';
import { NotificationBell } from '../notifications/NotificationBell';
import { useNotificationsRealtime } from '../notifications/hooks/useNotificationsRealtime';
import { disablePush } from '../../shared/push/pushManager';

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (isSuperAdmin(user)) {
    if (location.pathname !== '/dashboard') {
      return <Navigate to="/dashboard" replace />;
    }
    return <SuperAdminShell />;
  }

  if (location.pathname === '/dashboard') {
    return <Navigate to="/dashboard/profile" replace />;
  }

  return <ProfessionalDashboardShell />;
}

function SuperAdminShell() {
  const clearSession = useAuthStore((state) => state.logout);

  const logout = () => {
    void disablePush().finally(() => clearSession());
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-surface-soft)',
      }}
    >
      <header
        className="flex items-center justify-between px-4 py-4 lg:px-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 relative">
            <Group />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '18px',
              color: 'var(--color-text-brand)',
            }}
          >
            agendya
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="text-sm font-medium"
            style={{
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}

function ProfessionalDashboardShell() {
  const user = useAuthStore((state) => state.user);
  const initial = user?.businessName?.charAt(0).toUpperCase() ?? '?';

  // Single mount point for the real-time connection: toasts, the notification
  // centre cache, and the unread badge all update from here.
  useNotificationsRealtime();

  return (
    <div className="flex min-h-screen" style={{ fontFamily: 'var(--font-body)', backgroundColor: 'var(--color-surface-soft)' }}>
      <a href="#main-content" className="agendia-skip-link">
        Saltar al contenido principal
      </a>

      <Sidebar />

      <div className="flex flex-1 flex-col min-h-screen pb-16 lg:pb-0" style={{ minWidth: 0 }}>
        {/* Mobile top bar */}
        <div
          className="flex lg:hidden items-center justify-between px-4 pt-6 pb-4"
          style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 relative">
              <Group />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--color-text-brand)' }}>
              agendya
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--color-text-on-brand)' }}>
                {initial}
              </span>
            </div>
          </div>
        </div>

        <main id="main-content" tabIndex={-1} className="flex-1 w-full px-4 py-6 lg:px-8 lg:py-8" style={{ overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Principal"
        className="flex lg:hidden fixed bottom-0 left-0 right-0 items-center justify-around px-4 py-3"
        style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', zIndex: 50 }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className="flex flex-col items-center gap-0.5"
            style={({ isActive }) => ({ color: isActive ? 'var(--color-text-brand)' : 'var(--color-text-muted)', minWidth: '56px' })}
          >
            {({ isActive }) => (
              <>
                <NavIcon id={item.id} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: isActive ? 600 : 400, marginTop: '2px' }}>
                  {item.label}
                </span>
                {isActive && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-brand-primary)' }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <ToastHost />
      <Announcer />
    </div>
  );
}
