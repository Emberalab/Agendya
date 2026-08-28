import type { PublicService } from '@agendya/types';
import { Card, CardContent } from '../../../shared/components/Card';

interface ServiceSelectorProps {
  services: PublicService[];
  selectedServiceIds: string[];
  onToggle: (serviceId: string) => void;
}

export function ServiceSelector({
  services,
  selectedServiceIds,
  onToggle,
}: ServiceSelectorProps) {
  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">
            Este profesional todavía no tiene servicios disponibles.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalMinutes = services
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          1. Elige servicios
        </h2>
        {totalMinutes > 0 && (
          <span className="rounded-full bg-black px-3 py-1 text-sm font-medium text-white">
            Total: {totalMinutes} min
          </span>
        )}
      </div>
      <div className="grid gap-3">
        {services.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id);
          return (
            <Card
              key={service.id}
              hover
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-black bg-black ring-2 ring-gray-400'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              onClick={() => onToggle(service.id)}
            >
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`text-lg font-semibold ${
                      isSelected
                        ? 'text-black'
                        : 'text-gray-600'
                    }`}>
                      {service.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-sm opacity-70">🕐</span>
                      <span className={`text-sm ${
                        isSelected
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      }`}>
                        {service.durationMinutes} min
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                      <span className="text-black">✓</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
