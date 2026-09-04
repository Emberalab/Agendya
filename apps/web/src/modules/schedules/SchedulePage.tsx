import { BlockedDatesManager } from './BlockedDatesManager';
import { useWorkingHours } from './hooks/useWorkingHours';
import { WeeklyScheduleTable } from './WeeklyScheduleTable';

export function SchedulePage() {
  const { data: workingHours, isLoading, isError } = useWorkingHours();

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="w-full">
      <h1
        className="text-[24px] lg:text-[28px]"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '4px',
        }}
      >
        Horario Semanal
      </h1>
      <p
        className="text-[13px] lg:text-sm mb-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Define los días y horarios en los que tus clientes podrán reservar citas
        contigo. Puedes modificar esta configuración cuando quieras.
      </p>

      {isLoading && (
        <div
          className="rounded-2xl flex items-center justify-center py-16"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Cargando horario…
          </p>
        </div>
      )}

      {!isLoading && isError && (
        <div
          className="rounded-2xl flex items-center justify-center py-16"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            No pudimos cargar tu horario. Inténtalo de nuevo.
          </p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col gap-8">
          <WeeklyScheduleTable hours={workingHours ?? []} />
          <BlockedDatesManager />
        </div>
      )}
    </div>
  );
}
