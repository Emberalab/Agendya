import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@agendya/types';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Checkbox, FormGroup, Input } from '@moondesignsystem/react';
import Group from '../../imports/Group11';
import { apiBaseUrl } from '../../shared/api/apiClient';
import {
  getApiErrorMessage,
  isWaitlistRequiredError,
} from '../../shared/api/getApiErrorMessage';
import { AccessWaitlistForm } from './AccessWaitlistForm';
import { useRegister } from './hooks/useRegister';

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=1200&h=900&fit=crop&auto=format';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const [searchParams] = useSearchParams();
  const waitlistEmail = searchParams.get('email') ?? '';
  const showWaitlist =
    searchParams.get('waitlist') === '1' ||
    isWaitlistRequiredError(registerMutation.error);

  const onSubmit = handleSubmit((data) => {
    registerMutation.mutate(data, {
      onSuccess: () => navigate('/dashboard/profile', { replace: true }),
    });
  });

  const handleGoogleRegister = () => {
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  return (
    <div className="flex min-h-screen w-full" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Left panel — register form */}
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

        <div className="w-full max-w-sm mx-auto">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border)' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="9" cy="8" r="4" stroke="#64748B" strokeWidth="1.5" />
              <path d="M1 19c0-4 3.6-7 8-7s8 3 8 7" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M17 7v6M20 10h-6" stroke="var(--color-brand-primary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Crea tu cuenta
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {showWaitlist
              ? 'Aún no abrimos cuentas para todo el mundo. Reserva tu cupo y te avisamos.'
              : 'Comienza a gestionar tus reservas de forma profesional'}
          </p>

          {showWaitlist ? (
            <AccessWaitlistForm
              initialEmail={getValues('email') || waitlistEmail}
              initialBusiness={getValues('businessName') ?? ''}
            />
          ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Controller
              name="businessName"
              control={control}
              render={({ field }) => (
                <FormGroup error={!!errors.businessName}>
                  <FormGroup.Label htmlFor="businessName" className="agendia-label">
                    Nombre de tu negocio *
                  </FormGroup.Label>
                  <Input
                    {...field}
                    id="businessName"
                    type="text"
                    autoComplete="organization"
                    placeholder="Ej. María Belleza, Peluquería Ana..."
                    size="md"
                    variant="outline"
                    error={!!errors.businessName}
                    aria-invalid={!!errors.businessName}
                    aria-describedby={errors.businessName ? 'businessName-error' : undefined}
                    style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  />
                  {errors.businessName && (
                    <FormGroup.Hint id="businessName-error" role="alert">
                      {errors.businessName.message}
                    </FormGroup.Hint>
                  )}
                </FormGroup>
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <FormGroup error={!!errors.email}>
                  <FormGroup.Label htmlFor="reg-email" className="agendia-label">
                    Correo electrónico *
                  </FormGroup.Label>
                  <Input
                    {...field}
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@empresa.com"
                    size="md"
                    variant="outline"
                    error={!!errors.email}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'reg-email-error' : undefined}
                    style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  />
                  {errors.email && (
                    <FormGroup.Hint id="reg-email-error" role="alert">
                      {errors.email.message}
                    </FormGroup.Hint>
                  )}
                </FormGroup>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <FormGroup error={!!errors.password}>
                  <FormGroup.Label htmlFor="reg-password" className="agendia-label">
                    Contraseña *
                  </FormGroup.Label>
                  <div className="relative">
                    <Input
                      {...field}
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      size="md"
                      variant="outline"
                      error={!!errors.password}
                      aria-invalid={!!errors.password}
                      aria-describedby="reg-password-hint"
                      className="pr-10"
                      style={{ paddingLeft: '12px', paddingRight: '12px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <FormGroup.Hint
                    id="reg-password-hint"
                    role={errors.password ? 'alert' : undefined}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: errors.password ? undefined : 'var(--color-text-muted)',
                    }}
                  >
                    {errors.password ? errors.password.message : 'Debe contener 1 mayúscula, 1 número, mínimo 8 caracteres'}
                  </FormGroup.Hint>
                </FormGroup>
              )}
            />

            <div className="flex items-start gap-2" style={{ margin: '20px 0' }}>
              <Checkbox
                checked={acceptTerms}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcceptTerms(e.target.checked)}
                aria-label="Acepto los Términos de uso y la Política de privacidad"
                required
              />
              <span
                className="text-sm leading-snug"
                style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
              >
                Acepto los{' '}
                <span style={{ color: 'var(--color-text-brand)', fontWeight: 600 }}>Términos de uso</span> y la{' '}
                <span style={{ color: 'var(--color-text-brand)', fontWeight: 600 }}>Política de privacidad</span>
              </span>
            </div>

            {registerMutation.isError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3">
                <p className="text-sm text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-body)' }}>
                  {getApiErrorMessage(registerMutation.error)}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="fill"
              context="brand"
              size="md"
              isFullWidth
              disabled={registerMutation.isPending || !acceptTerms}
            >
              {registerMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </Button>
          </form>
          )}

          {!showWaitlist && (
          <>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="agendia-label text-xs uppercase">O regístrate con</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-surface-soft)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-brand-primary)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(79,70,229,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-surface)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>
          </>
          )}

          <p
            className="text-sm text-center mt-6"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-semibold underline"
              style={{ color: 'var(--color-text-brand)', fontFamily: 'var(--font-body)' }}
            >
              Inicia sesión
            </Link>
          </p>
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
            "Desde que usamos agendya, redujimos las citas perdidas un 80%. Nuestros clientes adoran poder reservar
            desde el celular."
          </blockquote>
          <div>
            <p className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              Carolina Méndez
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>
              Propietaria, Studio Glamour
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
