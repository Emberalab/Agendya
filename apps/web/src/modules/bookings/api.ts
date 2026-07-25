import type { AgendaBooking } from '@ronda/types';
import { apiClient } from '../../shared/api/apiClient';

export async function listAgenda(
  from: string,
  to: string,
): Promise<AgendaBooking[]> {
  const { data } = await apiClient.get<AgendaBooking[]>('/bookings', {
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
