import { useState } from 'react';
import {
  FEATURE_CATALOG,
  FEATURE_IDS,
  PLAN_LABELS,
  PLANS,
  hasFeature,
  getLimit,
  type Plan,
  type FeatureId,
} from '@agendya/types';

export function FeatureComparison() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <div
      className="max-w-6xl"
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="mb-6">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Funcionalidades por Plan
        </h2>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Catálogo de solo lectura. Cambiar una flag implica editar el código y
          redesplegar.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setSelectedPlan(null)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor:
              selectedPlan === null
                ? 'var(--color-brand-primary)'
                : 'var(--color-surface)',
            color:
              selectedPlan === null
                ? 'var(--color-text-on-brand)'
                : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          Ver Todos
        </button>
        {PLANS.map((plan) => (
          <button
            key={plan}
            type="button"
            onClick={() => setSelectedPlan(plan)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor:
                selectedPlan === plan
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-surface)',
              color:
                selectedPlan === plan
                  ? 'var(--color-text-on-brand)'
                  : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {PLAN_LABELS[plan]}
          </button>
        ))}
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left text-sm font-semibold" style={{ minWidth: '250px' }}>
                Funcionalidad
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Tipo</th>
              {selectedPlan ? (
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  {PLAN_LABELS[selectedPlan]}
                </th>
              ) : (
                PLANS.map((plan) => (
                  <th key={plan} className="px-4 py-3 text-center text-sm font-semibold">
                    {PLAN_LABELS[plan]}
                  </th>
                ))
              )}
              <th className="px-4 py-3 text-center text-sm font-semibold">
                En API
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_IDS.map((featureId) => {
              const feature = FEATURE_CATALOG[featureId];
              return (
                <tr
                  key={featureId}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3 text-sm">{feature.label}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    <span
                      className="px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--color-surface-soft)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {feature.kind === 'toggle' ? 'Flag' : 'Límite'}
                    </span>
                  </td>
                  {selectedPlan ? (
                    <FeatureCell
                      featureId={featureId}
                      plan={selectedPlan}
                      feature={feature}
                    />
                  ) : (
                    PLANS.map((plan) => (
                      <FeatureCell
                        key={plan}
                        featureId={featureId}
                        plan={plan}
                        feature={feature}
                      />
                    ))
                  )}
                  <td className="px-4 py-3 text-center text-xs">
                    {feature.enforced ? 'Sí' : 'No'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureCell({
  featureId,
  plan,
  feature,
}: {
  featureId: FeatureId;
  plan: Plan;
  feature: (typeof FEATURE_CATALOG)[FeatureId];
}) {
  if (feature.kind === 'toggle') {
    const included = hasFeature(plan, featureId);
    return (
      <td
        className="px-4 py-3 text-center text-sm"
        style={{
          color: included
            ? 'var(--color-success)'
            : 'var(--color-text-muted)',
        }}
      >
        {included ? '✓' : '—'}
      </td>
    );
  }

  // Limit feature
  const limit = getLimit(plan, featureId);
  return (
    <td
      className="px-4 py-3 text-center text-sm font-medium"
      style={{
        color:
          limit === null
            ? 'var(--color-success)'
            : 'var(--color-text-primary)',
      }}
    >
      {limit === null ? '∞' : limit}
    </td>
  );
}
