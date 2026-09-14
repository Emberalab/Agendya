import { Navigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { postAuthPath } from './postAuthPath';
import Group from '../../imports/Group11';
import { disablePush } from '../../shared/push/pushManager';

export function PendingAccessPage() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.logout);

  if (user?.accessStatus !== 'PENDING') {
    return <Navigate to={postAuthPath(user)} replace />;
  }

  const logout = () => {
    void disablePush().finally(() => clearSession());
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-8"
      style={{
        fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 relative">
            <Group />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '24px',
              color: 'var(--color-text-brand)',
            }}
          >
            agendya
          </span>
        </div>

        <h1
          className="text-2xl font-bold mb-3"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
          }}
        >
          Acceso pendiente
        </h1>
        <p
          className="text-sm mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Registramos tu cuenta. Todavía no tienes acceso al panel; te avisamos
          cuando lo habilitemos.
        </p>
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {user.email}
        </p>

        <button
          type="button"
          onClick={logout}
          className="text-sm font-medium"
          style={{
            color: 'var(--color-text-brand)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            padding: 0,
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
