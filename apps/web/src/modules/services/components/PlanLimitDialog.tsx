import { PLAN_SERVICE_LIMITS, type Plan } from '@agendya/types';
import { useFocusTrap } from '../../../shared/a11y/useFocusTrap';

interface PlanLimitDialogProps {
  plan: Plan;
  used: number;
  onClose: () => void;
  onSeePlans: () => void;
}

const PERKS = [
  'Crear más servicios ilimitados.',
  'Gestionar más reservas y clientes concurrentes.',
  'Acceder a funcionalidades de marketing adicionales.',
  'Eliminar completamente la publicidad.',
];

export function PlanLimitDialog({
  plan,
  used,
  onClose,
  onSeePlans,
}: PlanLimitDialogProps) {
  const limit = PLAN_SERVICE_LIMITS[plan];
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Límite de servicios alcanzado"
        className="w-full max-w-[520px] rounded-3xl p-10 flex flex-col items-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: 'var(--color-brand-surface)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect
              x="4"
              y="10.5"
              width="16"
              height="10.5"
              rx="2.5"
              fill="#4F46E5"
            />
            <path
              d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"
              stroke="#4F46E5"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="14.5" r="1.6" fill="#fff" />
            <path
              d="M12 15v2.5"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2
          className="text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '24px',
            color: 'var(--color-text-primary)',
          }}
        >
          Límite de servicios alcanzado
        </h2>
        <p
          className="text-center mt-1.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            color: 'var(--color-text-secondary)',
          }}
        >
          Alcanzaste el límite de servicios de tu plan
        </p>

        <div
          className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3 mt-6"
          style={{ backgroundColor: 'var(--color-brand-surface)' }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
          />
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-text-brand)',
            }}
          >
            Actualmente tienes{' '}
            <strong style={{ fontWeight: 700 }}>
              {used} de {limit ?? '∞'}
            </strong>{' '}
            servicios creados.
          </p>
        </div>

        <p
          className="mt-5"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.6',
          }}
        >
          Para agregar nuevos servicios, puedes mejorar tu plan y ampliar las
          capacidades de tu cuenta.
        </p>

        <p
          className="w-full mt-6 mb-3"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--color-text-brand)',
          }}
        >
          CON UN PLAN SUPERIOR PODRÁS:
        </p>
        <ul className="w-full flex flex-col gap-3">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ flexShrink: 0, marginTop: '3px' }}
              >
                <path
                  d="M3 8.5l3 3 7-7.5"
                  stroke="var(--color-brand-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                }}
              >
                {perk}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex gap-3 w-full mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            Ahora no
          </button>
          <button
            onClick={onSeePlans}
            className="flex-1 py-4 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Ver planes
          </button>
        </div>
      </div>
    </div>
  );
}
