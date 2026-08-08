import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormGroup, Input } from '@moondesignsystem/react';
import Group from '../../imports/Group11';

type Step = 'request' | 'error';

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1601342630314-8427c38bf5e6?w=1200&h=900&fit=crop&auto=format';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex min-h-screen w-full" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Left panel — request form */}
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

        <div className="flex-1 flex items-center py-10">
          {step === 'request' ? (
            <div className="w-full max-w-sm mx-auto">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border)' }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="4" stroke="#64748B" strokeWidth="1.5" />
                  <path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Recupera tu contraseña
              </h1>
              <p
                className="text-sm mb-7"
                style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
              >
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
          ) : (
            <div className="w-full max-w-sm mx-auto">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: '#FFF5F5', border: '1px solid var(--color-border)' }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M11 3L2 19h18L11 3z"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M11 9v4M11 15.5h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Algo salió mal
              </h1>
              <p
                className="text-sm mb-6"
                style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
              >
                No pudimos procesar tu solicitud. Esto puede deberse a un problema de conexión o un error temporal.
              </p>

              <div
                className="flex flex-col items-center gap-2 py-5 rounded-xl mb-5"
                style={{ backgroundColor: '#FFF7F7', border: '1px solid #FECACA' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M9 2L2 15h14L9 2z"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M9 7v4M9 13h.01" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
                >
                  Error de red o de autenticación temporal.
                </span>
              </div>

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
          )}
        </div>

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
