import {
  WEEKDAYS,
  type SetWorkingHoursInput,
  type Weekday,
  type WorkingHour,
} from '@ronda/types';
import { useEffect, useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useSetWorkingHours } from './hooks/useSetWorkingHours';
import { minutesToTimeString, timeStringToMinutes } from './time.util';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  SUNDAY: 'Domingo',
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
};

interface DayRow {
  dayOfWeek: Weekday;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function buildRows(workingHours: WorkingHour[]): DayRow[] {
  return WEEKDAYS.map((dayOfWeek) => {
    const existing = workingHours.find((hour) => hour.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      enabled: Boolean(existing),
      startTime: existing ? minutesToTimeString(existing.startMinute) : '09:00',
      endTime: existing ? minutesToTimeString(existing.endMinute) : '18:00',
    };
  });
}

export function WorkingHoursEditor({
  workingHours,
}: {
  workingHours: WorkingHour[];
}) {
  const [rows, setRows] = useState<DayRow[]>(() => buildRows(workingHours));
  const setWorkingHours = useSetWorkingHours();

  useEffect(() => {
    setRows(buildRows(workingHours));
  }, [workingHours]);

  const updateRow = (index: number, patch: Partial<DayRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const days: SetWorkingHoursInput['days'] = rows
      .filter((row) => row.enabled)
      .map((row) => ({
        dayOfWeek: row.dayOfWeek,
        startMinute: timeStringToMinutes(row.startTime),
        endMinute: timeStringToMinutes(row.endTime),
      }));
    setWorkingHours.mutate({ days });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">Horario semanal</h2>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.dayOfWeek} className="flex items-center gap-3">
            <label className="flex w-32 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(event) =>
                  updateRow(index, { enabled: event.target.checked })
                }
              />
              {WEEKDAY_LABELS[row.dayOfWeek]}
            </label>
            <input
              type="time"
              value={row.startTime}
              disabled={!row.enabled}
              onChange={(event) =>
                updateRow(index, { startTime: event.target.value })
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
            />
            <span className="text-sm text-gray-500">a</span>
            <input
              type="time"
              value={row.endTime}
              disabled={!row.enabled}
              onChange={(event) =>
                updateRow(index, { endTime: event.target.value })
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
            />
          </div>
        ))}
      </div>
      {setWorkingHours.isError && (
        <p className="mt-2 text-sm text-red-600">
          {getApiErrorMessage(setWorkingHours.error)}
        </p>
      )}
      {setWorkingHours.isSuccess && (
        <p className="mt-2 text-sm text-green-600">Horario guardado.</p>
      )}
      <button
        type="submit"
        disabled={setWorkingHours.isPending}
        className="mt-4 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {setWorkingHours.isPending ? 'Guardando…' : 'Guardar horario'}
      </button>
    </form>
  );
}
