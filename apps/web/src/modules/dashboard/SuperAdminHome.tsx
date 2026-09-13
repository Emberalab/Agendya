import { Link } from 'react-router-dom';

export function SuperAdminHome() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
      <h1
        className="text-3xl font-bold mb-4"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
        }}
      >
        Hola, SuperAdmin
      </h1>
      <p
        className="text-sm max-w-md mb-6"
        style={{
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        Panel de administrador para gestionar la lista de acceso, ver funcionalidades por plan, y cambiar suscripciones.
      </p>
      <Link
        to="/dashboard/admin"
        className="px-6 py-3 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: 'var(--color-brand-primary)',
          color: 'var(--color-text-on-brand)',
          fontFamily: 'var(--font-body)',
          textDecoration: 'none',
        }}
      >
        Ir al Panel de Admin
      </Link>
    </div>
  );
}
