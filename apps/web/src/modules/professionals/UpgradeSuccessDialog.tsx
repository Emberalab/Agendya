import { useNavigate } from 'react-router-dom';
import {
  formatPlanWithInterval,
  type BillingInterval,
  type Plan,
} from '@agendya/types';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';

interface UpgradeSuccessDialogProps {
  plan: Plan;
  interval: BillingInterval;
  onClose: () => void;
}

export function UpgradeSuccessDialog({
  plan,
  interval,
  onClose,
}: UpgradeSuccessDialogProps) {
  const navigate = useNavigate();
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);

  const handleGoToAgenda = () => {
    onClose();
    navigate('/dashboard/agenda');
  };

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
        aria-label="Plan actualizado"
        className="w-full max-w-[440px] rounded-3xl p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
          animation: 'scaleIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-brand-surface)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: 'var(--color-brand-primary)' }}
            >
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '24px',
            color: 'var(--color-text-primary)',
          }}
        >
          Plan actualizado
        </h2>

        {/* Body */}
        <p
          className="mt-3 text-center"
          style={{
            fontSize: '15px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          Ahora tienes el plan{' '}
          <span
            style={{
              fontWeight: 700,
              color: 'var(--color-text-brand)',
            }}
          >
            {formatPlanWithInterval(plan, interval)}
          </span>
          . Empieza a disfrutar de todas sus funcionalidades.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={handleGoToAgenda}
          className="w-full mt-8 py-4 rounded-2xl text-sm font-semibold"
          style={{
            backgroundColor: 'var(--color-brand-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Ir a la agenda
        </button>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
