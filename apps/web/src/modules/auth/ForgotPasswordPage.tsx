import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormGroup, Input } from '@moondesignsystem/react';
import { forgotPasswordSchema } from '@agendya/types';
import Group from '../../imports/Group11';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useForgotPassword } from './hooks/useForgotPassword';

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1601342630314-8427c38bf5e6?w=1200&h=900&fit=crop&auto=format';

function IconBox({ children, color = 'var(--color-surface-soft)' }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
      style={{ backgroundColor: color, border: '1px solid var(--color-border)' }}
    >
      {children}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  variant = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'success' | 'neutral' | 'error';
}) {
  const bg = variant === 'success' ? '#F0FDF4' : variant === 'error' ? '#FFF7F7' : 'var(--color-surface-soft)';
  const border = variant === 'success' ? '#BBF7D0' : variant === 'error' ? '#FECACA' : 'var(--color-border)';
  return (
    <div
      className="flex flex-col items-center gap-2 py-5 rounded-xl mb-5"
      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
    >
      {icon}
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
        {label}
      </span>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showSent, setShowSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const forgotPasswordMutation = useForgotPassword();

  // Manejar countdown con un solo intervalo limpio
  useEffect(() => {
    if (resendCountdown <= 0) return;

    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCountdown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError('');

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path[0] === 'email');
      if (emailIssue) {
        setEmailError(emailIssue.message);
        return;
      }
    }

    try {
      await forgotPasswordMutation.mutateAsync({ email });
      setShowSent(true);
      setResendCountdown(60);
    } catch (error) {
      setEmailError(getApiErrorMessage(error));
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;

    try {
      await forgotPasswordMutation.mutateAsync({ email });
      setResendCountdown(60);
    } catch {
      // Silent fail en reenvío
    }
  };

  if (showSent) {
    return (
      <div className="flex min-h-screen w-full" style={{ fontFamily: 'var(--font-body)' }}>
        <div
          className="flex flex-col justify-between w-full lg:w-1/2 px-8 py-10 md:px-16"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex items-center gap-2">
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

          <div className="flex-1 flex items-center py-10">
            <div className="w-full max-w-sm mx-auto">
              <IconBox>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="2" y="5" width="18" height="13" rx="2" stroke="#64748B" strokeWidth="1.5" />
                  <path d="M2 8l9 6 9-6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconBox>

              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Revisa tu correo
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                Si hay una cuenta con ese correo, te enviamos un enlace de recuperación. El enlace expira en 1 hora.
              </p>

              <StatusCard
                variant="success"
                icon={
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-success)' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M4 9l3.5 3.5L14 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                }
                label="Enlace enviado si el correo existe"
              />

              <Button
                variant="outline"
                size="md"
                isFullWidth
                onClick={handleResend}
                disabled={resendCountdown > 0}
              >
                {resendCountdown > 0 ? `Reenviar en ${resendCountdown}s` : 'Reenviar correo'}
              </Button>

              <p
                className="text-xs text-center mt-4"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
              >
                ¿No recibiste el correo? Revisa tu carpeta de spam o correo no deseado.
              </p>

              <p
                className="text-sm text-center mt-5"
                style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
              >
                <Link
                  to="/login"
                  className="font-semibold"
                  style={{ color: 'var(--color-text-brand)', fontFamily: 'var(--font-body)' }}
                >
                  Volver al inicio de sesión
                </Link>
              </p>
            </div>
          </div>

          <p className="agendia-label text-center">© 2026 agendya - Todos los derechos reservados.</p>
        </div>

        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_PHOTO})`, backgroundColor: '#1e1b4b' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 50%, transparent 100%)',
            }}
          />
          <div className="absolute bottom-10 left-10 right-10">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 18 18" fill="#FBBF24">
                  <path d="M9 1l2.47 5.01L17 6.82l-4 3.9.94 5.49L9 13.77 4.06 16.21 5 10.72 1 6.82l5.53-.81L9 1z" />
                </svg>
              ))}
            </div>
            <blockquote
              className="text-white text-xl font-semibold leading-snug mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              "Agendia transformó por completo la manera en que gestionamos nuestras citas. Ahora nuestros clientes
              reservan 24/7 sin esfuerzo."
            </blockquote>
            <div>
              <p className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                Valentina Ruiz
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>
                Directora de Operaciones, Clínica Bienestar
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="w-5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full" style={{ fontFamily: 'var(--font-body)' }}>
      <div
        className="flex flex-col justify-between w-full lg:w-1/2 px-8 py-10 md:px-16"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-2">
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

        <div className="flex-1 flex items-center py-10">
          <div className="w-full max-w-sm mx-auto">
            <IconBox>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="4" stroke="#64748B" strokeWidth="1.5" />
                <path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconBox>

            <h1
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              Recupera tu contraseña
            </h1>
            <p className="text-sm mb-7" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu
              contraseña.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FormGroup>
                <FormGroup.Label htmlFor="fp-email" className="agendia-label">
                  Correo electrónico *
                </FormGroup.Label>
                <Input
                  id="fp-email"
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  size="md"
                  variant="outline"
                  required
                  style={{ paddingLeft: '12px', paddingRight: '12px' }}
                />
                {emailError && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>
                    {emailError}
                  </p>
                )}
              </FormGroup>

              <Button
                type="submit"
                variant="fill"
                context="brand"
                size="md"
                isFullWidth
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
            </form>

            <p
              className="text-sm text-center mt-6"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
            >
              ¿Recordaste tu contraseña?{' '}
              <Link
                to="/login"
                className="font-semibold underline"
                style={{ color: 'var(--color-text-brand)', fontFamily: 'var(--font-body)' }}
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        <p className="agendia-label text-center">© 2026 agendya - Todos los derechos reservados.</p>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_PHOTO})`, backgroundColor: '#1e1b4b' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 50%, transparent 100%)',
          }}
        />
        <div className="absolute bottom-10 left-10 right-10">
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="18" height="18" viewBox="0 0 18 18" fill="#FBBF24">
                <path d="M9 1l2.47 5.01L17 6.82l-4 3.9.94 5.49L9 13.77 4.06 16.21 5 10.72 1 6.82l5.53-.81L9 1z" />
              </svg>
            ))}
          </div>
          <blockquote
            className="text-white text-xl font-semibold leading-snug mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            "Agendia transformó por completo la manera en que gestionamos nuestras citas. Ahora nuestros clientes
            reservan 24/7 sin esfuerzo."
          </blockquote>
          <div>
            <p className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              Valentina Ruiz
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>
              Directora de Operaciones, Clínica Bienestar
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="w-5 h-1.5 rounded-full bg-white" />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
