import { NavLink } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { useAuthStore } from '../auth/authStore';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ronda</h2>
          <p className="mt-1 truncate text-sm text-gray-600">
            {user?.businessName}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink
            to="/dashboard/agenda"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-black text-black' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="opacity-70">📅</span>
            <span>Agenda</span>
          </NavLink>
          <NavLink
            to="/dashboard/services"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-black text-black'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="opacity-70">✂️</span>
            <span>Servicios</span>
          </NavLink>
          <NavLink
            to="/dashboard/schedule"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-black text-black'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="opacity-70">🕐</span>
            <span>Horario</span>
          </NavLink>
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-black text-black'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="opacity-70">👤</span>
            <span>Perfil</span>
          </NavLink>
        </nav>
      </div>
      <div className="border-t border-gray-200 pt-4">
        <Button
          type="button"
          onClick={logout}
          variant="danger"
          size="sm"
          fullWidth
        >
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
