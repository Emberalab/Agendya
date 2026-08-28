import type {
  CreateScheduleExceptionInput,
  ScheduleException,
  SetWorkingHoursInput,
  WorkingHour,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function getWorkingHours(): Promise<WorkingHour[]> {
  const { data } = await apiClient.get<WorkingHour[]>(
    '/schedules/working-hours',
  );
  return data;
}

export async function setWorkingHours(
  input: SetWorkingHoursInput,
): Promise<WorkingHour[]> {
  const { data } = await apiClient.put<WorkingHour[]>(
    '/schedules/working-hours',
    input,
  );
  return data;
}

export async function listExceptions(): Promise<ScheduleException[]> {
  const { data } = await apiClient.get<ScheduleException[]>(
    '/schedules/exceptions',
  );
  return data;
}

export async function createException(
  input: CreateScheduleExceptionInput,
): Promise<ScheduleException> {
  const { data } = await apiClient.post<ScheduleException>(
    '/schedules/exceptions',
    input,
  );
  return data;
}

export async function deleteException(id: string): Promise<void> {
  await apiClient.delete(`/schedules/exceptions/${id}`);
}
