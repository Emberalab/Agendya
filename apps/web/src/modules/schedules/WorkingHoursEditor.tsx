import {
  WEEKDAYS,
  type SetWorkingHoursInput,
  type Weekday,
  type WorkingHour,
} from '@agendya/types';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/Card';
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
    <Card>
      <CardHeader>
        <CardTitle>Horario semanal</CardTitle>
        <CardDescription>
          Define tus días y horas de trabajo para que los clientes puedan reservar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <div key={row.dayOfWeek} className="flex items-center gap-3">
                <label className="flex w-36 items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) =>
                      updateRow(index, { enabled: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
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
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 disabled:bg-gray-50 disabled:opacity-50"
                />
                <span className="text-sm text-gray-500">a</span>
                <input
                  type="time"
                  value={row.endTime}
                  disabled={!row.enabled}
                  onChange={(event) =>
                    updateRow(index, { endTime: event.target.value })
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 disabled:bg-gray-50 disabled:opacity-50"
                />
              </div>
            ))}
          </div>

          {setWorkingHours.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">
                {getApiErrorMessage(setWorkingHours.error)}
              </p>
            </div>
          )}
          {setWorkingHours.isSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-600">✓ Horario guardado correctamente</p>
            </div>
          )}

          <div>
            <Button
              type="submit"
              variant="primary"
              disabled={setWorkingHours.isPending}
            >
              {setWorkingHours.isPending ? 'Guardando…' : 'Guardar horario'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
