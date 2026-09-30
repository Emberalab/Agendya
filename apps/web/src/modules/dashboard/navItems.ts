export type NavItemId =
  | 'agenda'
  | 'servicios'
  | 'horario'
  | 'perfil'
  | 'soporte';

export const NAV_ITEMS: { id: NavItemId; label: string; to: string }[] = [
  { id: 'agenda', label: 'Agenda', to: '/dashboard/agenda' },
	{ id: 'servicios', label: 'Servicios', to: '/dashboard/services' },
  { id: 'horario', label: 'Horario', to: '/dashboard/schedule' },
  { id: 'soporte', label: 'Soporte', to: '/dashboard/support' },
  { id: 'perfil', label: 'Perfil', to: '/dashboard/profile' },
];
