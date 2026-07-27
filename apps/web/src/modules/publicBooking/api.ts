import type {
  CreateBookingInput,
  PublicBooking,
  PublicProfessional,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function getPublicProfessional(
  slug: string,
): Promise<PublicProfessional> {
  const { data } = await apiClient.get<PublicProfessional>(
    `/public/professionals/${slug}`,
  );
  return data;
}

export async function getAvailability(
  slug: string,
  serviceIds: string[],
  date: string,
): Promise<string[]> {
  const { data } = await apiClient.get<{ slots: string[] }>(
    `/public/professionals/${slug}/availability`,
    {
      params: { serviceIds: serviceIds.join(','), date },
    },
  );
  return data.slots;
}

export async function createPublicBooking(
  slug: string,
  input: CreateBookingInput,
): Promise<PublicBooking> {
  const { data } = await apiClient.post<PublicBooking>(
    `/public/professionals/${slug}/bookings`,
    input,
  );
  return data;
}

export async function getBookingByToken(token: string): Promise<PublicBooking> {
  const { data } = await apiClient.get<PublicBooking>(
    `/public/bookings/${token}`,
  );
  return data;
}

export async function cancelBookingByToken(
  token: string,
): Promise<PublicBooking> {
  const { data } = await apiClient.post<PublicBooking>(
    `/public/bookings/${token}/cancel`,
  );
  return data;
}

export async function rescheduleBookingByToken(
  token: string,
  newStartAt: string,
): Promise<PublicBooking> {
  const { data } = await apiClient.post<PublicBooking>(
    `/public/bookings/${token}/reschedule`,
    { newStartAt },
  );
  return data;
}
