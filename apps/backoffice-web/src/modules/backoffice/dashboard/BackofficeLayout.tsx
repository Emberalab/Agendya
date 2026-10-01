import { NavLink, Outlet } from 'react-router-dom';
import Logo from '../../../imports/LogoGroup';
import { useBackofficeAuthStore } from '../auth/backofficeAuthStore';
import { roleHasPermission, ROLE_LABELS } from '../shared/permissions';
import { ThemeToggle } from '../../../shared/theme/ThemeToggle';
import { BackofficeNavIcon, type BackofficeNavIconId } from './BackofficeNavIcon';

interface NavItem {
  id: BackofficeNavIconId;
  to: string;
  label: string;
  end?: boolean;
}

const TOP_ITEMS: NavItem[] = [
  { id: 'panel', to: '/backoffice', label: 'Panel', end: true },
  { id: 'tickets', to: '/backoffice/tickets', label: 'Tickets' },
  { id: 'profesionales', to: '/backoffice/professionals', label: 'Profesionales' },
];

const ADMIN_ITEMS: NavItem[] = [{ id: 'auditoria', to: '/backoffice/audit-log', label: 'Auditoría' }];

const MANAGE_USERS_ITEM: NavItem = {
  id: 'usuarios',
  to: '/backoffice/internal-users',
  label: 'Usuarios internos',
};

// Same active/hover language and grouped-section layout as apps/web's
// Sidebar (modules/dashboard/Sidebar.tsx): brand-tint pill on the active
// item, muted icon otherwise, a small dot marker, plus a bottom nav bar
// below the `lg` breakpoint instead of a hamburger drawer — the same
// pattern apps/web uses for the same reason (this is an internal tool, but
// still needs to work on a phone in a pinch).
export function BackofficeLayout() {
  const user = useBackofficeAuthStore((state) => state.user);
  const logout = useBackofficeAuthStore((state) => state.logout);

  const canManageUsers = roleHasPermission(user?.role, 'MANAGE_INTERNAL_USERS');
  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';
  const mobileItems = canManageUsers
    ? [...TOP_ITEMS, ...ADMIN_ITEMS, MANAGE_USERS_ITEM]
    : [...TOP_ITEMS, ...ADMIN_ITEMS];

  return (
    <div className="flex min-h-screen">
      <aside
        className="sticky top-0 hidden h-screen w-[200px] shrink-0 flex-col border-r border-border bg-surface py-6 lg:flex"
        aria-label="Backoffice"
      >
        <div className="flex items-center gap-2 px-4 pb-1">
          <div className="relative size-6 shrink-0">
            <Logo />
          </div>
          <span className="text-lg font-bold whitespace-nowrap text-text-brand">agendya</span>
        </div>
        <p className="mb-5 px-4 text-xs font-semibold tracking-wide text-text-muted uppercase">
          Backoffice
        </p>

        <nav className="flex flex-1 flex-col gap-4 px-3" aria-label="Principal">
          <NavGroup items={TOP_ITEMS} />
          <div>
            <p className="mb-1 px-2.5 text-xs font-semibold tracking-wide text-text-muted uppercase">
              Administración
            </p>
            <NavGroup items={canManageUsers ? [...ADMIN_ITEMS, MANAGE_USERS_ITEM] : ADMIN_ITEMS} />
          </div>
        </nav>

        <div className="px-3">
          <div className="mx-0 mb-1 flex items-center gap-2.5 rounded-xl bg-surface-soft px-2.5 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-primary">
              <span className="text-xs font-bold text-on-brand">{initial}</span>
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-semibold text-text-primary">{user?.name}</p>
              <p className="truncate font-mono text-[11px] text-text-muted">
                {user ? ROLE_LABELS[user.role] : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center py-2">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-danger-surface hover:text-danger"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 13l4-4-4-4M16 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="relative size-6 shrink-0">
              <Logo />
            </div>
            <span className="text-lg font-bold text-text-brand">agendya</span>
            <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-text-muted">
              Backoffice
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-primary">
              <span className="text-xs font-bold text-on-brand">{initial}</span>
            </div>
          </div>
        </div>

        <main id="main-content" className="w-full flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — mirrors apps/web's Sidebar mobile nav bar. */}
      <nav
        aria-label="Principal"
        className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-around border-t border-border bg-surface px-2 py-3 lg:hidden"
      >
        {mobileItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-[52px] flex-col items-center gap-0.5 ${isActive ? 'text-text-brand' : 'text-text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <BackofficeNavIcon id={item.id} />
                <span className="text-[10px]" style={{ fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function NavGroup({ items }: { items: NavItem[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm ${
              isActive ? 'bg-brand-tint font-semibold text-text-brand' : 'text-text-secondary hover:bg-surface-soft'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-text-brand' : 'text-text-muted'}>
                <BackofficeNavIcon id={item.id} />
              </span>
              {item.label}
              {isActive && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-brand-primary" />}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
