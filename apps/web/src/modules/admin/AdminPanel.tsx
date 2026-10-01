import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AllowlistManager } from './AllowlistManager';
import { BillingTable } from './BillingTable';
import { FeatureComparison } from './FeatureComparison';
import { PlanChanger } from './PlanChanger';
import { RegistrationsManager } from './RegistrationsManager';

type Tab = 'registrations' | 'allowlist' | 'features' | 'plans' | 'billing';

const TABS: { id: Tab; label: string }[] = [
  { id: 'registrations', label: 'Registros' },
  { id: 'allowlist', label: 'Lista de Acceso' },
  { id: 'features', label: 'Funcionalidades' },
  { id: 'plans', label: 'Plan y prueba' },
  { id: 'billing', label: 'Precios' },
];

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('registrations');
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  // WAI-ARIA tabs pattern: one tab stop, arrows/Home/End move between tabs.
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft')
      next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    const id = TABS[next].id;
    setActiveTab(id);
    tabRefs.current[id]?.focus();
  };

  return (
    <div
      className="max-w-7xl mx-auto"
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Same page-title treatment as the professional dashboard (Outfit
          700, text-primary, 24→28px) — brand color is reserved for the
          wordmark, links and active states, not headings. */}
      <h1
        className="mb-6 text-[24px] lg:text-[28px]"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        Panel de Administrador
      </h1>

      {/* Scrolls horizontally on narrow screens instead of pushing the whole
          page sideways (five tabs don't fit in 360px). */}
      <div
        role="tablist"
        aria-label="Secciones del panel"
        className="chip-scroll -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
        style={{
          borderBottom: '1px solid var(--color-border)',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`admin-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`admin-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={onTabKeyDown}
              className="shrink-0 whitespace-nowrap px-4 py-3 text-sm"
              style={{
                fontWeight: selected ? 600 : 500,
                color: selected
                  ? 'var(--color-text-brand)'
                  : 'var(--color-text-secondary)',
                borderBottom: selected
                  ? '2px solid var(--color-brand-primary)'
                  : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`admin-panel-${activeTab}`}
        aria-labelledby={`admin-tab-${activeTab}`}
      >
        {activeTab === 'registrations' && <RegistrationsManager />}
        {activeTab === 'allowlist' && <AllowlistManager />}
        {activeTab === 'features' && <FeatureComparison />}
        {activeTab === 'plans' && <PlanChanger />}
        {activeTab === 'billing' && <BillingTable />}
      </div>
    </div>
  );
}
