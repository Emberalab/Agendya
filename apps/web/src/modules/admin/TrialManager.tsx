import { useState } from 'react';
import {
  PLAN_LABELS,
  TRIAL_DURATION_DAYS,
  TRIAL_MAX_EXTENSION_DAYS,
  TRIAL_PLAN,
  planRank,
  type ProfessionalForPlanChange,
  type TrialEventAction,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { trialRemainingLabel } from '../professionals/trial';

interface TrialManagerProps {
  professional: ProfessionalForPlanChange;
  onUpdated: (professional: ProfessionalForPlanChange) => void;
}

const ACTION_LABELS: Record<TrialEventAction, string> = {
  GRANTED: 'Prueba activada',
  EXTENDED: 'Prueba extendida',
  ENDED: 'Prueba terminada',
};

/** Agendya operates from Colombia; admin timestamps are shown in its time. */
const ADMIN_TIME_ZONE = 'America/Bogota';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ADMIN_TIME_ZONE,
  });
}

/**
 * Trial controls for one account. The server validates and audits every
 * action; this only collects intent (no dates are ever sent).
 */
export function TrialManager({ professional, onUpdated }: TrialManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [note, setNote] = useState('');

  const { trial } = professional;
  const base = `/admin/professionals/${encodeURIComponent(professional.email)}/trial`;
  const hasFullPlan = planRank(professional.plan) >= planRank(TRIAL_PLAN);
  const usedBefore = trial !== null && !trial.active;

  const run = async (
    path: string,
    body: Record<string, unknown>,
    confirmText: string,
    successText: string,
  ) => {
    if (!confirm(confirmText)) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const trimmed = note.trim();
      const { data } = await apiClient.post<ProfessionalForPlanChange>(path, {
        ...body,
        ...(trimmed ? { note: trimmed } : {}),
      });
      onUpdated(data);
      setNote('');
      setAllowRepeat(false);
      setSuccess(successText);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar la prueba.'));
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle = (enabled: boolean, danger = false) => ({
    backgroundColor: !enabled
      ? 'var(--color-surface-soft)'
      : danger
        ? 'var(--color-danger-surface)'
        : 'var(--color-brand-primary)',
    color: !enabled
      ? 'var(--color-text-muted)'
      : danger
        ? 'var(--color-danger)'
        : 'var(--color-text-on-brand)',
    border: danger && enabled ? '1px solid var(--color-danger-border)' : 'none',
  });

  const canGrant =
    !hasFullPlan && !trial?.active && (!usedBefore || allowRepeat);

  return (
    <section
      className="mt-6 pt-6"
      style={{ borderTop: '1px solid var(--color-border)' }}
      aria-labelledby="trial-heading"
    >
      <h3 id="trial-heading" className="text-base font-semibold mb-3">
        Período de prueba
      </h3>

      <dl className="space-y-2 mb-4 text-sm">
        <div>
          <dt
            className="font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Estado
          </dt>
          <dd>
            {trial?.active
              ? `Activa · acceso completo (${PLAN_LABELS[TRIAL_PLAN]})`
              : trial
                ? 'Terminada'
                : 'Sin período de prueba'}
          </dd>
        </div>
        <div>
          <dt
            className="font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Plan que aplica ahora
          </dt>
          <dd>{PLAN_LABELS[professional.effectivePlan]}</dd>
        </div>
        {trial && (
          <>
            <div>
              <dt
                className="font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Inició
              </dt>
              <dd>{formatDateTime(trial.startedAt)}</dd>
            </div>
            <div>
              <dt
                className="font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {trial.active ? 'Termina' : 'Terminó'}
              </dt>
              <dd>
                {formatDateTime(trial.endsAt)} (hora de Colombia)
                {trial.active && ` · quedan ${trialRemainingLabel(trial)}`}
              </dd>
            </div>
          </>
        )}
      </dl>

      {error && (
        <p
          role="alert"
          className="p-3 mb-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-danger-surface)',
            color: 'var(--color-danger)',
            border: '1px solid var(--color-danger-border)',
          }}
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="p-3 mb-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--status-confirmed-bg)',
            color: 'var(--color-success)',
            border: '1px solid var(--status-confirmed-border)',
          }}
        >
          {success}
        </p>
      )}

      <label className="block text-sm font-medium mb-1" htmlFor="trial-note">
        Nota para el historial (opcional)
      </label>
      <input
        id="trial-note"
        type="text"
        maxLength={200}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full px-3 py-2 rounded-lg mb-4 text-sm"
        style={{
          backgroundColor: 'var(--color-surface-soft)',
          border: '1px solid var(--color-border)',
        }}
        placeholder="Ej.: piloto barberías Medellín"
      />

      {trial?.active ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="trial-extend-days"
            >
              Días a extender
            </label>
            <input
              id="trial-extend-days"
              type="number"
              min={1}
              max={TRIAL_MAX_EXTENSION_DAYS}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-surface-soft)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void run(
                `${base}/extend`,
                { days: extendDays },
                `¿Extender la prueba de ${professional.email} ${extendDays} días?`,
                `Prueba extendida ${extendDays} días.`,
              )
            }
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={buttonStyle(!loading)}
          >
            Extender
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void run(
                `${base}/end`,
                {},
                `¿Terminar ya la prueba de ${professional.email}? Volverá a los límites del plan ${PLAN_LABELS[professional.plan]}. No se borra ningún dato.`,
                'Prueba terminada.',
              )
            }
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={buttonStyle(!loading, true)}
          >
            Terminar prueba
          </button>
        </div>
      ) : (
        <div>
          {hasFullPlan && (
            <p
              className="text-sm mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Esta cuenta ya tiene acceso completo con su plan.
            </p>
          )}
          {usedBefore && !hasFullPlan && (
            <label className="flex items-center gap-2 text-sm mb-3">
              <input
                type="checkbox"
                checked={allowRepeat}
                onChange={(e) => setAllowRepeat(e.target.checked)}
              />
              Esta cuenta ya usó su prueba. Permitir una nueva (excepción).
            </label>
          )}
          <button
            type="button"
            disabled={loading || !canGrant}
            onClick={() =>
              void run(
                base,
                usedBefore ? { allowRepeat: true } : {},
                `¿Activar una prueba de ${TRIAL_DURATION_DAYS} días con acceso completo para ${professional.email}?`,
                `Prueba de ${TRIAL_DURATION_DAYS} días activada.`,
              )
            }
            className="w-full px-4 py-3 rounded-lg text-sm font-medium"
            style={buttonStyle(!loading && canGrant)}
          >
            {`Activar prueba de ${TRIAL_DURATION_DAYS} días`}
          </button>
        </div>
      )}

      {professional.trialHistory.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2">Historial de la prueba</h4>
          <ul className="space-y-2 text-sm">
            {professional.trialHistory.map((event) => (
              <li
                key={event.id}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface-soft)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p className="font-medium">
                  {ACTION_LABELS[event.action]} ·{' '}
                  {formatDateTime(event.createdAt)}
                </p>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Por {event.actorEmail} · termina{' '}
                  {formatDateTime(event.endsAt)}
                </p>
                {event.note && (
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    “{event.note}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
