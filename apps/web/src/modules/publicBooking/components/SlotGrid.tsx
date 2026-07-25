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
      <p className="text-sm text-gray-500">Buscando horarios disponibles…</p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No hay horarios disponibles ese día. Prueba otra fecha.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onSelect(slot)}
          className={`rounded border px-2 py-2 text-sm ${
            selectedSlot === slot
              ? 'border-black bg-gray-50 font-medium'
              : 'border-gray-300'
          }`}
        >
          {new Date(slot).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </button>
      ))}
    </div>
  );
}
