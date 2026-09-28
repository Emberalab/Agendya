import { Link } from 'react-router-dom';
import { planStatus, type ProfessionalProfile } from '@agendya/types';

interface PlanStatusBannerProps {
  profile: ProfessionalProfile;
}

export function PlanStatusBanner({ profile }: PlanStatusBannerProps) {
  const status = planStatus(
    profile.plan,
    profile.planExpiresAt ? new Date(profile.planExpiresAt) : null,
    profile.planCancelledAt ? new Date(profile.planCancelledAt) : null,
  );

  // Solo mostrar banner para CANCELLED y GRACE
  if (status !== 'CANCELLED' && status !== 'GRACE') {
    return null;
  }

  // Solo mostrar si vence en ≤7 días
  if (!profile.planExpiresAt) return null;

  const expiresAt = new Date(profile.planExpiresAt);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysRemaining > 7) return null;

  const isGrace = status === 'GRACE';
  const isCancelled = status === 'CANCELLED';

  return (
    <div
      role="alert"
      className="w-full px-4 py-3"
      style={{
        backgroundColor: isGrace ? '#FEE2E2' : '#FEF3C7',
        borderBottom: `1px solid ${isGrace ? '#FCA5A5' : '#FCD34D'}`,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {isGrace ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: '#DC2626', flexShrink: 0 }}
            >
              <path
                d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: '#D97706', flexShrink: 0 }}
            >
              <path
                d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isGrace ? '#991B1B' : '#92400E',
              }}
            >
              {isGrace && (
                <>
                  Tu plan venció y está en período de gracia. Tienes{' '}
                  {daysRemaining > 0 ? `${daysRemaining} días` : 'menos de 1 día'}{' '}
                  para renovar.
                </>
              )}
              {isCancelled && (
                <>
                  Tu suscripción fue cancelada. Podrás usar tu plan hasta el{' '}
                  {expiresAt.toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                  })}
                  .
                </>
              )}
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/profile"
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: isGrace ? '#DC2626' : '#D97706',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          {isGrace ? 'Renovar ahora' : 'Ver detalles'}
        </Link>
      </div>
    </div>
  );
}
