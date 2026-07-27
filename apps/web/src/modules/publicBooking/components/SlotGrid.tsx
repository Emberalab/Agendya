import { Button } from '../../../shared/components/Button';

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
        <p className="text-sm text-gray-500">Buscando horarios disponibles…</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
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
          variant={selectedSlot === slot ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onSelect(slot)}
          className="h-auto py-3"
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
