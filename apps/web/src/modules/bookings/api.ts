import type { AgendaBooking, RescheduleBookingInput } from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function listAgenda(
  from: string,
  to: string,
): Promise<AgendaBooking[]> {
  const { data} = await apiClient.get<AgendaBooking[]>('/bookings', {
    params: { from, to },
  });
  return data;
}

export async function cancelBooking(id: string): Promise<AgendaBooking> {
  const { data } = await apiClient.patch<AgendaBooking>(
    `/bookings/${id}/cancel`,
  );
  return data;
}

export async function rescheduleBooking(
  id: string,
  input: RescheduleBookingInput,
): Promise<AgendaBooking> {
  const { data } = await apiClient.patch<AgendaBooking>(
    `/bookings/${id}/reschedule`,
    input,
  );
  return data;
}
