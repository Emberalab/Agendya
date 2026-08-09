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
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{ backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-border)' }}
      >
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
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
