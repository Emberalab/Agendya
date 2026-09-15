import { useQuery } from '@tanstack/react-query';
import { investigateAppointment } from '../api';

export function useAppointmentInvestigation(bookingId: string) {
  return useQuery({
    queryKey: ['backoffice', 'appointments', bookingId],
    queryFn: () => investigateAppointment(bookingId),
    enabled: !!bookingId,
  });
}
