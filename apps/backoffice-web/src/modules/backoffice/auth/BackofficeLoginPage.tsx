import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  backofficeLoginSchema,
  type BackofficeGoogleError,
} from '@agendya/types';
import { backofficeLogin, googleSignInUrl, PENDING_REMEMBER_KEY } from './api';
import { useBackofficeAuthStore } from './backofficeAuthStore';
import {
  getBackofficeErrorMessage,
  isBackofficeApiError,
} from '../shared/backofficeApiClient';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { PasswordInput } from '../../../shared/components/PasswordInput';
import { AuthAlert, AuthHeading, AuthIcon, AuthLayout } from './AuthLayout';
import { GoogleButton } from './GoogleButton';

const GOOGLE_ERROR_MESSAGES: Record<BackofficeGoogleError, string> = {
  google_unavailable:
    'El acceso con Google aún no está habilitado. Ingresa con tu correo y contraseña.',
  google_no_account:
    'No hay una cuenta activa del Backoffice con ese correo de Google. Pide acceso a un administrador.',
  google_not_allowed:
    'Esa cuenta de Google no está autorizada para el Backoffice. Usa tu correo de trabajo.',
  google_failed:
    'No pudimos completar el acceso con Google. Vuelve a intentarlo.',
};

export function BackofficeLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useBackofficeAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const googleError = searchParams.get('error') as BackofficeGoogleError | null;
  const googleErrorMessage = googleError
    ? GOOGLE_ERROR_MESSAGES[googleError]
    : undefined;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = backofficeLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const response = await backofficeLogin(parsed.data);
      setSession(response, remember);
      navigate('/backoffice', { replace: true });
    } catch (err) {
      if (isBackofficeApiError(err) && err.status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else if (isBackofficeApiError(err) && err.status === 429) {
        setError(
          'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
        );
      } else {
        setError(
          getBackofficeErrorMessage(
            err,
            'No se pudo iniciar sesión. Intenta de nuevo.',
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = () => {
    try {
      window.sessionStorage.setItem(PENDING_REMEMBER_KEY, remember ? '1' : '0');
    } catch {
      /* storage blocked — the session simply won't be remembered */
    }
    window.location.assign(googleSignInUrl());
  };

  return (
    <AuthLayout>
      <AuthIcon>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle
            cx="11"
            cy="8"
            r="4"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 19c0-4 3.6-7 8-7s8 3 8 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </AuthIcon>
      <AuthHeading
        title="Inicia sesión"
        subtitle="Acceso solo para el equipo interno de Agendya."
      />

      {googleErrorMessage && (
        <AuthAlert tone="danger">{googleErrorMessage}</AuthAlert>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          placeholder="nombre@agendya.co"
          autoComplete="email"
          required
          fieldSize="lg"
          error={fieldErrors.email}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordInput
          id="password"
          label="Contraseña"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          fieldSize="lg"
          error={fieldErrors.password}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              className="size-4"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Recordarme
          </label>
          <Link
            to={
              email
                ? `/backoffice/forgot-password?email=${encodeURIComponent(email)}`
                : '/backoffice/forgot-password'
            }
            className="text-sm font-medium text-text-brand hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth disabled={loading} className="min-h-11">
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-xs font-medium tracking-wide text-text-secondary uppercase">
          O continúa con
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onClick={onGoogle} />
      <p className="mt-3 text-center text-xs leading-relaxed text-text-secondary">
        Solo funciona con el correo de una cuenta del Backoffice ya creada.
      </p>

      <p className="mt-6 text-center text-sm text-text-secondary">
        ¿No tienes cuenta? Pídela a un administrador del Backoffice.
      </p>
    </AuthLayout>
  );
}
