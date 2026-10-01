import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BACKOFFICE_RESET_TOKEN_INVALID_CODE,
  backofficePasswordSchema,
} from '@agendya/types';
import { resetPassword } from './api';
import { useBackofficeAuthStore } from './backofficeAuthStore';
import {
  getBackofficeErrorMessage,
  isBackofficeApiError,
} from '../shared/backofficeApiClient';
import { Button } from '../../../shared/components/Button';
import { PasswordInput } from '../../../shared/components/PasswordInput';
import { AuthAlert, AuthHeading, AuthIcon, AuthLayout } from './AuthLayout';

type Status = 'form' | 'done' | 'invalid';

function isInvalidLink(err: unknown): boolean {
  if (!isBackofficeApiError(err)) return false;
  const data = err.data as { code?: string } | null;
  return data?.code === BACKOFFICE_RESET_TOKEN_INVALID_CODE;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const logout = useBackofficeAuthStore((state) => state.logout);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(token ? 'form' : 'invalid');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = backofficePasswordSchema.safeParse(password);
    const nextErrors = {
      password: parsed.success ? undefined : parsed.error.issues[0]?.message,
      confirm:
        password === confirm ? undefined : 'Las contraseñas no coinciden.',
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) return;

    setError(null);
    setLoading(true);
    try {
      await resetPassword({ token, password });
      // The reset revoked every existing session server-side; drop any stale
      // one in this browser too so the next screen is a clean sign-in.
      logout();
      setStatus('done');
    } catch (err) {
      if (isInvalidLink(err)) setStatus('invalid');
      else
        setError(
          getBackofficeErrorMessage(
            err,
            'No se pudo cambiar la contraseña. Inténtalo de nuevo.',
          ),
        );
    } finally {
      setLoading(false);
    }
  };

  if (status === 'invalid') {
    return (
      <AuthLayout>
        <AuthIcon>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle
              cx="11"
              cy="11"
              r="9"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M11 7v4M11 15h.01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </AuthIcon>
        <AuthHeading
          title="Enlace no válido"
          subtitle="Este enlace ya se usó, expiró o está incompleto. Los enlaces duran 1 hora y sirven una sola vez."
        />
        <Link
          to="/backoffice/forgot-password"
          className="flex min-h-11 w-full items-center justify-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-on-brand hover:bg-brand-primary-hover"
        >
          Pedir un enlace nuevo
        </Link>
        <p className="mt-6 text-center text-sm">
          <Link
            to="/backoffice/login"
            className="font-semibold text-text-brand hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </AuthLayout>
    );
  }

  if (status === 'done') {
    return (
      <AuthLayout>
        <AuthIcon>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle
              cx="11"
              cy="11"
              r="9"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M7 11l3 3 5-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </AuthIcon>
        <AuthHeading
          title="Contraseña actualizada"
          subtitle="Ya puedes iniciar sesión con tu nueva contraseña. Por seguridad cerramos las demás sesiones abiertas."
        />
        <Link
          to="/backoffice/login"
          className="flex min-h-11 w-full items-center justify-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-on-brand hover:bg-brand-primary-hover"
        >
          Iniciar sesión
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthIcon>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect
            x="5"
            y="9"
            width="12"
            height="9"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 9V6a3 3 0 0 1 6 0v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </AuthIcon>
      <AuthHeading
        title="Crea una nueva contraseña"
        subtitle="Usa al menos 8 caracteres."
      />
      {error && <AuthAlert tone="danger">{error}</AuthAlert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <PasswordInput
          id="new-password"
          label="Nueva contraseña"
          autoComplete="new-password"
          required
          fieldSize="lg"
          error={errors.password}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirma la contraseña"
          autoComplete="new-password"
          required
          fieldSize="lg"
          error={errors.confirm}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <Button type="submit" fullWidth className="min-h-11" disabled={loading}>
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthLayout>
  );
}
