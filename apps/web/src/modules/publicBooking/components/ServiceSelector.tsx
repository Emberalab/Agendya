import type { PublicService } from '@ronda/types';

interface ServiceSelectorProps {
  services: PublicService[];
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
}

export function ServiceSelector({
  services,
  selectedServiceId,
  onSelect,
}: ServiceSelectorProps) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Este profesional todavía no tiene servicios disponibles.
      </p>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">1. Elige un servicio</h2>
      <div className="flex flex-col gap-2">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service.id)}
            className={`rounded border px-4 py-3 text-left ${
              selectedServiceId === service.id
                ? 'border-black bg-gray-50'
                : 'border-gray-300'
            }`}
          >
            <p className="font-medium">{service.name}</p>
            <p className="text-sm text-gray-500">
              {service.durationMinutes} min
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
