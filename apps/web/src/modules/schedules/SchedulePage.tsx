import { BlockedDatesManager } from './BlockedDatesManager';
import { useWorkingHours } from './hooks/useWorkingHours';
import { WorkingHoursEditor } from './WorkingHoursEditor';

export function SchedulePage() {
  const { data: workingHours, isLoading } = useWorkingHours();

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Tu horario</h1>
      <p className="mb-6 text-sm text-gray-500">
        Define cuándo trabajas y bloquea fechas puntuales.
      </p>

      {isLoading || !workingHours ? (
        <p>Cargando horario…</p>
      ) : (
        <WorkingHoursEditor workingHours={workingHours} />
      )}

      <BlockedDatesManager />
    </div>
  );
}
