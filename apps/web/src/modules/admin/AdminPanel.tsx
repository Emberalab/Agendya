import { useState } from 'react';
import { AllowlistManager } from './AllowlistManager';
import { FeatureComparison } from './FeatureComparison';
import { PlanChanger } from './PlanChanger';

type Tab = 'allowlist' | 'features' | 'plans';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('allowlist');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'allowlist', label: 'Lista de Acceso' },
    { id: 'features', label: 'Funcionalidades' },
    { id: 'plans', label: 'Cambiar Plan' },
  ];

  return (
    <div
      className="max-w-7xl mx-auto"
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text-primary)',
      }}
    >
      <h1
        className="text-3xl font-bold mb-6"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-brand)',
        }}
      >
        Panel de Administrador
      </h1>

      <div
        className="flex gap-2 mb-6"
        style={{
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-sm font-medium"
            style={{
              color:
                activeTab === tab.id
                  ? 'var(--color-text-brand)'
                  : 'var(--color-text-secondary)',
              borderBottom:
                activeTab === tab.id
                  ? '2px solid var(--color-brand-primary)'
                  : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'allowlist' && <AllowlistManager />}
        {activeTab === 'features' && <FeatureComparison />}
        {activeTab === 'plans' && <PlanChanger />}
      </div>
    </div>
  );
}
