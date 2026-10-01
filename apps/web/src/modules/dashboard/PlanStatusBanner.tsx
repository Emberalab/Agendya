import { Link } from 'react-router-dom';
import { planStatus, type ProfessionalProfile } from '@agendya/types';
import {
  formatTrialDate,
  trialRemainingLabel,
} from '../professionals/trial';

interface PlanStatusBannerProps {
  profile: ProfessionalProfile;
}

export function PlanStatusBanner({ profile }: PlanStatusBannerProps) {
  const status = planStatus(
    profile.plan,
    profile.planExpiresAt ? new Date(profile.planExpiresAt) : null,
    profile.planCancelledAt ? new Date(profile.planCancelledAt) : null,
  );

  const now = new Date();
  const expiresAt = profile.planExpiresAt
    ? new Date(profile.planExpiresAt)
    : null;
  const daysRemaining = expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Payment warnings (CANCELLED / GRACE, ≤7 días) take priority: they need
  // action. Otherwise an active trial gets its informative banner.
  const paymentWarning =
    (status === 'CANCELLED' || status === 'GRACE') &&
    expiresAt !== null &&
    daysRemaining !== null &&
    daysRemaining <= 7;

  if (!paymentWarning || !expiresAt || daysRemaining === null) {
    return profile.trial?.active ? <TrialBanner profile={profile} /> : null;
  }

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

function TrialBanner({ profile }: PlanStatusBannerProps) {
  const trial = profile.trial;
  if (!trial) return null;

  return (
    <div
      role="status"
      className="w-full px-4 py-3"
      style={{
        backgroundColor: 'var(--color-brand-surface)',
        borderBottom: '1px solid var(--color-brand-border)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            style={{ color: 'var(--color-text-brand)', flexShrink: 0 }}
          >
            <path
              d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-primary)',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              Estás disfrutando de acceso completo durante tu período de
              prueba.
            </span>{' '}
            Tu período de prueba termina en {trialRemainingLabel(trial)} (
            {formatTrialDate(trial.endsAt, profile.timezone)}).
          </p>
        </div>
        <Link
          to="/dashboard/profile"
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: 'var(--color-brand-primary)',
            color: 'var(--color-text-on-brand)',
            textDecoration: 'none',
          }}
        >
          Ver detalles
        </Link>
      </div>
    </div>
  );
}
