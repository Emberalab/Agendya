import { Button } from '@moondesignsystem/react';

interface SlotGridProps {
  slots: string[];
  isLoading: boolean;
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
}

export function SlotGrid({
  slots,
  isLoading,
  selectedSlot,
  onSelect,
}: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Buscando horarios disponibles…
        </p>
      </div>
    );
  }

  if (slots.length === 0) {
    // Not an error — nothing failed — but it stops the customer cold with no
    // clear next step, so it gets the same amber "needs your attention"
    // treatment as the rest of the app's warnings (e.g. "Horario superpuesto"
    // in BlockFormDrawer.tsx), not the muted gray an inert empty state would
    // get, so it actually reads as "pick another date" rather than "broken."
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-lg p-4"
        style={{
          backgroundColor: 'var(--status-pending-bg)',
          border: '1px solid var(--status-pending-border)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: '1px', color: 'var(--status-pending-color)' }}
        >
          <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 5.5V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="9" cy="12.2" r="0.9" fill="currentColor" />
        </svg>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--status-pending-color)',
            textAlign: 'left',
          }}
        >
          No hay horarios disponibles ese día. Prueba otra fecha.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => (
        <Button
          key={slot}
          type="button"
          variant={selectedSlot === slot ? 'fill' : 'outline'}
          context="brand"
          size="sm"
          onClick={() => onSelect(slot)}
          style={{ height: 'auto', paddingTop: '12px', paddingBottom: '12px' }}
        >
          {new Date(slot).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Button>
      ))}
    </div>
  );
}
