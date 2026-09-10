export const WAITLIST_ENDPOINT =
  import.meta.env.VITE_WAITLIST_URL ||
  'https://launch.agendya.co/api/waitlist.php';

export interface AccessWaitlistPayload {
  name: string;
  business: string;
  city: string;
  whatsapp: string;
  email: string;
}

export async function submitAccessWaitlist(
  data: AccessWaitlistPayload,
): Promise<{ success: boolean }> {
  const response = await fetch(WAITLIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    return { success: false };
  }
  try {
    const json = (await response.json()) as { success?: boolean };
    return { success: Boolean(json.success) };
  } catch {
    return { success: false };
  }
}
