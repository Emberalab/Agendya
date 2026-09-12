import { useState } from 'react';
import { PLAN_LABELS, PLANS, type Plan, type ProfessionalForPlanChange } from '@agendya/types';
import { apiClient, isApiError } from '../../shared/api/apiClient';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';

export function PlanChanger() {
  const [searchEmail, setSearchEmail] = useState('');
  const [professional, setProfessional] =
    useState<ProfessionalForPlanChange | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setError('Escribe un correo electrónico.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const { data } = await apiClient.get<ProfessionalForPlanChange>(
        `/admin/professionals/${encodeURIComponent(searchEmail.trim())}`,
      );
      setProfessional(data);
      setSelectedPlan(data.plan);
    } catch (err) {
      setProfessional(null);
      setError(
        isApiError(err) && err.status === 404
          ? `No hay un profesional con el correo ${searchEmail}.`
          : getApiErrorMessage(err, 'No se pudo buscar el profesional.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!professional || !selectedPlan || selectedPlan === professional.plan) {
      return;
    }

    const from = PLAN_LABELS[professional.plan];
    const to = PLAN_LABELS[selectedPlan];
    if (!confirm(`¿Cambiar el plan de ${professional.email} de ${from} a ${to}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.patch<ProfessionalForPlanChange>(
        `/admin/professionals/${encodeURIComponent(professional.email)}/plan`,
        { plan: selectedPlan },
      );
      setProfessional(data);
      setSuccess(`Plan actualizado: ${from} → ${PLAN_LABELS[data.plan]}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cambiar el plan.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl" style={{ fontFamily: 'var(--font-body)' }}>
      <h2
        className="text-2xl font-bold mb-6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Cambiar plan
      </h2>

      <div
        className="p-6 rounded-lg mb-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <label className="block text-sm font-medium mb-2">
          Buscar profesional por correo
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => {
              setSearchEmail(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSearch();
            }}
            className="flex-1 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--color-surface-soft)',
              border: '1px solid var(--color-border)',
            }}
            placeholder="usuario@ejemplo.com"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-brand-primary)',
              color: 'var(--color-text-on-brand)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="p-4 mb-4 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-danger-surface)',
            color: 'var(--color-danger)',
            border: '1px solid var(--color-danger-border)',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="p-4 mb-4 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--status-confirmed-bg)',
            color: 'var(--color-success)',
            border: '1px solid var(--status-confirmed-border)',
          }}
        >
          {success}
        </div>
      )}

      {professional && (
        <div
          className="p-6 rounded-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <dl className="space-y-3 mb-6 text-sm">
            <div>
              <dt
                className="font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Email
              </dt>
              <dd>{professional.email}</dd>
            </div>
            <div>
              <dt
                className="font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Negocio
              </dt>
              <dd>{professional.businessName}</dd>
            </div>
            <div>
              <dt
                className="font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Slug
              </dt>
              <dd>{professional.slug}</dd>
            </div>
            <div>
              <dt
                className="font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Plan actual
              </dt>
              <dd>
                <span
                  className="px-2 py-1 rounded font-medium"
                  style={{
                    backgroundColor: 'var(--color-brand-primary)',
                    color: 'var(--color-text-on-brand)',
                  }}
                >
                  {PLAN_LABELS[professional.plan]}
                </span>
              </dd>
            </div>
          </dl>

          <label className="block text-sm font-medium mb-3">Nuevo plan</label>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {PLANS.map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => {
                  setSelectedPlan(plan);
                  setError(null);
                  setSuccess(null);
                }}
                className="px-4 py-3 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor:
                    selectedPlan === plan
                      ? 'var(--color-brand-primary)'
                      : 'var(--color-surface-soft)',
                  color:
                    selectedPlan === plan
                      ? 'var(--color-text-on-brand)'
                      : 'var(--color-text-primary)',
                  border: `1px solid ${
                    selectedPlan === plan
                      ? 'var(--color-brand-primary)'
                      : 'var(--color-border)'
                  }`,
                }}
              >
                {PLAN_LABELS[plan]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleChangePlan()}
            disabled={loading || selectedPlan === professional.plan}
            className="w-full px-4 py-3 rounded-lg text-sm font-medium"
            style={{
              backgroundColor:
                loading || selectedPlan === professional.plan
                  ? 'var(--color-surface-soft)'
                  : 'var(--color-brand-primary)',
              color:
                loading || selectedPlan === professional.plan
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-on-brand)',
            }}
          >
            {loading ? 'Guardando…' : 'Cambiar plan'}
          </button>
        </div>
      )}
    </div>
  );
}
