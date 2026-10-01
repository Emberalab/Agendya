import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { backofficeForgotPasswordSchema } from '@agendya/types';
import { requestPasswordReset } from './api';
import {
  getBackofficeErrorMessage,
  isBackofficeApiError,
} from '../shared/backofficeApiClient';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { AuthAlert, AuthHeading, AuthIcon, AuthLayout } from './AuthLayout';

const RESEND_COOLDOWN_S = 30;

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const send = async (address: string) => {
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset({ email: address });
      setSentTo(address);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(
        isBackofficeApiError(err) && err.status === 429
          ? 'Ya pediste varios enlaces. Espera un minuto y vuelve a intentarlo.'
          : getBackofficeErrorMessage(
              err,
              'No se pudo enviar el enlace. Inténtalo de nuevo.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = backofficeForgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.email?.[0]);
      return;
    }
    setFieldError(undefined);
    void send(parsed.data.email);
  };

  if (sentTo) {
    return (
      <AuthLayout>
        <AuthIcon>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect
              x="2"
              y="5"
              width="18"
              height="13"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M2 8l9 6 9-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </AuthIcon>
        <AuthHeading
          title="Revisa tu correo"
          subtitle={
            <>
              Si{' '}
              <strong className="font-semibold text-text-primary">
                {sentTo}
              </strong>{' '}
              corresponde a una cuenta activa del Backoffice, te enviamos un
              enlace para crear una nueva contraseña. Expira en 1 hora.
            </>
          }
        />
        {error && <AuthAlert tone="danger">{error}</AuthAlert>}
        <Button
          variant="outline"
          fullWidth
          className="min-h-11"
          disabled={loading || cooldown > 0}
          onClick={() => void send(sentTo)}
        >
          {loading
            ? 'Enviando…'
            : cooldown > 0
              ? `Reenviar en ${cooldown} s`
              : 'Reenviar enlace'}
        </Button>
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
        title="¿Olvidaste tu contraseña?"
        subtitle="Escribe el correo de tu cuenta del Backoffice y te enviaremos un enlace para crear una nueva."
      />
      {error && <AuthAlert tone="danger">{error}</AuthAlert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          placeholder="nombre@agendya.co"
          autoComplete="email"
          required
          fieldSize="lg"
          error={fieldError}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" fullWidth className="min-h-11" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>
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
