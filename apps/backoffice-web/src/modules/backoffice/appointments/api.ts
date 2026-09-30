import type { AppointmentInvestigation } from '@agendya/types';
import { backofficeApiClient } from '../shared/backofficeApiClient';

export async function investigateAppointment(
  bookingId: string,
): Promise<AppointmentInvestigation> {
  const { data } = await backofficeApiClient.get<AppointmentInvestigation>(
    `/backoffice/appointments/${bookingId}`,
  );
  return data;
}
