import type {
  CheckSlugResponse,
  ProfessionalProfile,
  UpdateProfileInput,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

export async function getMyProfile(): Promise<ProfessionalProfile> {
  const { data } =
    await apiClient.get<ProfessionalProfile>('/professionals/me');
  return data;
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<ProfessionalProfile> {
  const { data } = await apiClient.patch<ProfessionalProfile>(
    '/professionals/me',
    input,
  );
  return data;
}

export async function checkSlugAvailability(
  slug: string,
): Promise<CheckSlugResponse> {
  const { data } = await apiClient.get<CheckSlugResponse>(
    '/professionals/check-slug',
    {
      params: { slug },
    },
  );
  return data;
}

export async function uploadImage(
  file: File,
  type: 'logo' | 'cover' = 'logo',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<{ url: string }>(
    '/upload/image',
    formData,
    {
      params: { type },
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return data.url;
}
