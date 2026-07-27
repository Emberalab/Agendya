import { Card, CardContent } from '../../shared/components/Card';
import { BlockedDatesManager } from './BlockedDatesManager';
import { useWorkingHours } from './hooks/useWorkingHours';
import { WorkingHoursEditor } from './WorkingHoursEditor';

export function SchedulePage() {
  const { data: workingHours, isLoading } = useWorkingHours();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Tu horario</h1>
        <p className="text-gray-600">
          Define cuándo trabajas y bloquea fechas puntuales.
        </p>
      </div>

      {isLoading || !workingHours ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Cargando horario…</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <WorkingHoursEditor workingHours={workingHours} />
          <BlockedDatesManager />
        </div>
      )}
    </div>
  );
}
