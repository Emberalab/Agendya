import { NavLink, Outlet } from 'react-router-dom';
import { useBackofficeAuthStore } from '../auth/backofficeAuthStore';
import { roleHasPermission, ROLE_LABELS } from '../shared/permissions';

const NAV_ITEMS = [
  { to: '/backoffice', label: 'Panel', end: true },
  { to: '/backoffice/tickets', label: 'Tickets' },
  { to: '/backoffice/professionals', label: 'Profesionales' },
  { to: '/backoffice/audit-log', label: 'Auditoría' },
] as const;

export function BackofficeLayout() {
  const user = useBackofficeAuthStore((state) => state.user);
  const logout = useBackofficeAuthStore((state) => state.logout);

  const canManageUsers = roleHasPermission(user?.role, 'MANAGE_INTERNAL_USERS');

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-gray-200 bg-white py-6 dark:border-gray-800 dark:bg-gray-900 md:flex">
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Agendya
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Backoffice
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Backoffice">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {canManageUsers && (
            <NavLink
              to="/backoffice/internal-users"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`
              }
            >
              Usuarios internos
            </NavLink>
          )}
        </nav>

        <div className="mt-auto border-t border-gray-200 px-5 pt-4 dark:border-gray-800">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {user?.name}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {user ? ROLE_LABELS[user.role] : ''}
          </p>
          <button
            onClick={logout}
            className="mt-3 text-sm font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
