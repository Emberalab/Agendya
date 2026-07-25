import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-gray-200 bg-gray-50 p-4">
      <div>
        <p className="mb-6 truncate text-sm font-medium text-gray-500">
          {user?.businessName}
        </p>
        <nav className="flex flex-col gap-1">
          <NavLink
            to="/dashboard/agenda"
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            Agenda
          </NavLink>
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            Perfil
          </NavLink>
          <NavLink
            to="/dashboard/services"
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            Servicios
          </NavLink>
          <NavLink
            to="/dashboard/schedule"
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`
            }
          >
            Horario
          </NavLink>
        </nav>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
