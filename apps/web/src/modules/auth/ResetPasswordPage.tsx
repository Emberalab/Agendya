import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button, FormGroup, Input } from '@moondesignsystem/react';
import { resetPasswordSchema } from '@agendya/types';
import Group from '../../imports/Group11';
import { getApiErrorMessage, isResetTokenInvalidError } from '../../shared/api/getApiErrorMessage';
import { useResetPassword } from './hooks/useResetPassword';

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

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);

  const resetPasswordMutation = useResetPassword();

  // Verificar token al montar
  useEffect(() => {
    if (!token || token.trim() === '') {
      setIsTokenInvalid(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError('');

    if (!token) {
      setIsTokenInvalid(true);
      return;
    }

    const result = resetPasswordSchema.safeParse({ token, password });
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path[0] === 'password');
      if (passwordIssue) {
        setPasswordError(passwordIssue.message);
        return;
      }
    }

    try {
      await resetPasswordMutation.mutateAsync({ token, password });
      setShowSuccess(true);
    } catch (error) {
      // Detectar error específico de token inválido
      if (isResetTokenInvalidError(error)) {
        setIsTokenInvalid(true);
      } else {
        setPasswordError(getApiErrorMessage(error));
      }
    }
  };

  // Estado: Token inválido o expirado
  if (isTokenInvalid) {
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
              <IconBox color="#FFF7F7">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="9" stroke="#EF4444" strokeWidth="1.5" />
                  <path d="M11 7v4M11 15h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconBox>

              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Enlace expirado
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                Este enlace de recuperación ya no es válido. Los enlaces expiran después de 1 hora por seguridad.
              </p>

              <StatusCard
                variant="error"
                icon={
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-danger)' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M13 5L5 13M5 5l8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                }
                label="Token inválido o expirado"
              />

              <Link to="/forgot-password">
                <Button variant="fill" context="brand" size="md" isFullWidth>
                  Solicitar nuevo enlace
                </Button>
              </Link>

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

  // Estado: Contraseña cambiada exitosamente
  if (showSuccess) {
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
              <IconBox color="#F0FDF4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="9" stroke="#10B981" strokeWidth="1.5" />
                  <path d="M7 11l3 3 5-6" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconBox>

              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Contraseña actualizada
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                Tu contraseña se cambió correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
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
                label="Contraseña cambiada exitosamente"
              />

              <Button
                variant="fill"
                context="brand"
                size="md"
                isFullWidth
                onClick={() => navigate('/login')}
              >
                Ir a inicio de sesión
              </Button>
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

  // Estado: Formulario de nueva contraseña
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
                <rect x="5" y="9" width="12" height="9" rx="2" stroke="#64748B" strokeWidth="1.5" />
                <path d="M8 9V6a3 3 0 0 1 6 0v3" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="11" cy="13.5" r="1" fill="#64748B" />
              </svg>
            </IconBox>

            <h1
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              Crea tu nueva contraseña
            </h1>
            <p className="text-sm mb-7" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              Ingresa una contraseña nueva y segura para tu cuenta.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FormGroup>
                <FormGroup.Label htmlFor="reset-password" className="agendia-label">
                  Nueva contraseña *
                </FormGroup.Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  size="md"
                  variant="outline"
                  required
                  style={{ paddingLeft: '12px', paddingRight: '12px' }}
                />
                {passwordError && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>
                    {passwordError}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Debe tener al menos 8 caracteres
                </p>
              </FormGroup>

              <Button
                type="submit"
                variant="fill"
                context="brand"
                size="md"
                isFullWidth
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
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
