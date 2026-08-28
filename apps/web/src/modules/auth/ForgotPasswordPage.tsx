import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, FormGroup, Input } from '@moondesignsystem/react';
import Group from '../../imports/Group11';

type Step = 'request' | 'sent' | 'new-password' | 'expired' | 'success' | 'error';

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

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos una letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Al menos un número', met: /[0-9]/.test(password) },
    { label: 'Al menos un carácter especial (ej: #, @, $)', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const metCount = checks.filter((c) => c.met).length;
  const strength = metCount <= 1 ? 'Débil' : metCount <= 2 ? 'Regular' : metCount === 3 ? 'Medio' : 'Fuerte';
  const strengthColor = metCount <= 1 ? '#EF4444' : metCount <= 2 ? '#F59E0B' : metCount === 3 ? '#F59E0B' : '#10B981';
  const barWidth = `${(metCount / 4) * 100}%`;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Fortaleza de contraseña
        </span>
        <span className="text-xs font-semibold" style={{ color: strengthColor, fontFamily: 'var(--font-mono)' }}>
          {strength}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: barWidth, backgroundColor: strengthColor }}
        />
      </div>
      <ul className="mt-3 space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {c.met ? (
                <>
                  <circle cx="7" cy="7" r="7" fill="#10B981" />
                  <path d="M4 7l2.5 2.5L10 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </>
              ) : (
                <circle cx="7" cy="7" r="6.5" stroke="var(--color-border)" />
              )}
            </svg>
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--font-body)', color: c.met ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function eyeIcon(visible: boolean) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
      {visible && <path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (step !== 'success') return;
    if (countdown === 0) {
      navigate('/login');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown, navigate]);

  const handleRequest = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep('sent');
  };

  const handleResend = () => {
    setResending(true);
    setTimeout(() => setResending(false), 800);
  };

  const handleReset = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    setResetting(true);
    setTimeout(() => {
      setResetting(false);
      setStep('success');
    }, 1000);
  };

  const renderStep = () => {
    if (step === 'request') {
      return (
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

          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <FormGroup>
              <FormGroup.Label htmlFor="fp-email" className="agendia-label">
                Correo electrónico *
              </FormGroup.Label>
              <Input
                id="fp-email"
                type="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                size="md"
                variant="outline"
                required
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
              />
            </FormGroup>

            <Button type="submit" variant="fill" context="brand" size="md" isFullWidth>
              Enviar enlace de recuperación
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
              style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-body)' }}
            >
              Inicia sesión
            </Link>
          </p>

          <button
            type="button"
            onClick={() => setStep('error')}
            className="w-full text-xs py-2 rounded-lg text-center mt-3"
            style={{
              border: '1px dashed var(--color-border)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              background: 'none',
            }}
          >
            Demo: error del sistema →
          </button>
        </div>
      );
    }

    if (step === 'sent') {
      return (
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
            Hemos enviado un enlace de recuperación a tu correo electrónico. El enlace expira en 30 minutos.
          </p>

          <StatusCard
            variant="success"
            icon={
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#10B981' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9l3.5 3.5L14 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            }
            label="Enlace enviado a tu correo"
          />

          <Button variant="outline" size="md" isFullWidth onClick={handleResend} disabled={resending}>
            Reenviar correo
          </Button>

          <p
            className="text-xs text-center mt-4"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            ¿No recibiste el correo? Revisa tu carpeta de spam o correo no deseado.
          </p>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setStep('new-password')}
              className="flex-1 text-xs py-2 rounded-lg text-center"
              style={{
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Demo: abrir enlace →
            </button>
            <button
              type="button"
              onClick={() => setStep('expired')}
              className="flex-1 text-xs py-2 rounded-lg text-center"
              style={{
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              Demo: enlace vencido →
            </button>
          </div>

          <p
            className="text-sm text-center mt-5"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            <Link
              to="/login"
              className="font-semibold"
              style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-body)' }}
            >
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      );
    }

    if (step === 'new-password') {
      return (
        <div className="w-full max-w-sm mx-auto">
          <IconBox>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="5" y="10" width="12" height="9" rx="2" stroke="#64748B" strokeWidth="1.5" />
              <path d="M8 10V7a3 3 0 016 0v3" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconBox>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Crea tu nueva contraseña
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Tu nueva contraseña debe ser diferente a las contraseñas anteriores.
          </p>

          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <FormGroup>
              <FormGroup.Label htmlFor="np-new" className="agendia-label">
                Nueva contraseña *
              </FormGroup.Label>
              <div className="relative">
                <Input
                  id="np-new"
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  size="md"
                  variant="outline"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {eyeIcon(showNew)}
                </button>
              </div>
            </FormGroup>

            <FormGroup>
              <FormGroup.Label htmlFor="np-confirm" className="agendia-label">
                Confirmar contraseña *
              </FormGroup.Label>
              <div className="relative">
                <Input
                  id="np-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  size="md"
                  variant="outline"
                  style={{ paddingLeft: '12px', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {eyeIcon(showConfirm)}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs mt-1" style={{ color: '#EF4444', fontFamily: 'var(--font-mono)' }}>
                  Las contraseñas no coinciden
                </p>
              )}
            </FormGroup>

            {newPassword && <PasswordStrengthBar password={newPassword} />}

            <Button
              type="submit"
              variant="fill"
              context="brand"
              size="md"
              isFullWidth
              disabled={resetting || !newPassword || newPassword !== confirmPassword}
              style={{ marginTop: newPassword ? '12px' : '0' }}
            >
              {resetting ? 'Guardando...' : 'Restablecer contraseña'}
            </Button>
          </form>
        </div>
      );
    }

    if (step === 'expired') {
      return (
        <div className="w-full max-w-sm mx-auto">
          <IconBox>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#64748B" strokeWidth="1.5" />
              <path d="M11 7v4.5l3 2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBox>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            El enlace ha expirado
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            El enlace de recuperación que utilizaste ya no es válido. Los enlaces expiran después de 30 minutos por
            seguridad.
          </p>

          <StatusCard
            variant="error"
            icon={
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L2 15h14L9 2z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 8v3M9 13h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            }
            label="Código de error: LINK_EXPIRED_30M"
          />

          <Button
            variant="fill"
            context="brand"
            size="md"
            isFullWidth
            onClick={() => {
              setEmail('');
              setStep('request');
            }}
          >
            Solicitar nuevo enlace
          </Button>

          <p
            className="text-sm text-center mt-5"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            <Link
              to="/login"
              className="font-semibold"
              style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-body)' }}
            >
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      );
    }

    if (step === 'success') {
      return (
        <div className="w-full max-w-sm mx-auto">
          <IconBox color="#ECFDF5">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#10B981" strokeWidth="1.5" />
              <path d="M7 11l3 3 5-5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBox>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            ¡Contraseña actualizada!
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>

          <StatusCard
            variant="success"
            icon={
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#10B981' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9l3.5 3.5L14 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            }
            label="Cambio procesado con éxito de forma segura."
          />

          <Button variant="fill" context="brand" size="md" isFullWidth onClick={() => navigate('/login')}>
            Iniciar sesión
          </Button>

          <p
            className="text-sm text-center mt-4"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            Serás redirigido automáticamente en{' '}
            <span style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>{countdown} segundos</span>
          </p>
        </div>
      );
    }

    return (
      <div className="w-full max-w-sm mx-auto">
        <IconBox color="#FFF5F5">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 3L2 19h18L11 3z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 9v4M11 15.5h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconBox>

        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
        >
          Algo salió mal
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
          No pudimos procesar tu solicitud. Esto puede deberse a un problema de conexión o un error temporal.
        </p>

        <StatusCard
          variant="error"
          icon={
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EF4444' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L2 15h14L9 2z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 7v4M9 13h.01" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          }
          label="Error de red o de autenticación temporal."
        />

        <div className="flex flex-col gap-3">
          <Button variant="fill" context="brand" size="md" isFullWidth onClick={() => setStep('request')}>
            Intentar de nuevo
          </Button>
          <Button variant="outline" size="md" isFullWidth>
            Contactar soporte
          </Button>
        </div>

        <p
          className="text-sm text-center mt-5"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
        >
          <Link
            to="/login"
            className="font-semibold"
            style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-body)' }}
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Left panel */}
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
              color: 'var(--color-brand-primary)',
            }}
          >
            agendya
          </span>
        </div>

        <div className="flex-1 flex items-center py-10">{renderStep()}</div>

        <p className="agendia-label text-center">© 2026 agendya - Todos los derechos reservados.</p>
      </div>

      {/* Right panel — photo + testimonial */}
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
