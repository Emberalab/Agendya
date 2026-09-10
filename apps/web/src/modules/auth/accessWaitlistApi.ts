const configured = import.meta.env.VITE_WAITLIST_URL;
export const WAITLIST_ENDPOINT =
  typeof configured === 'string' && configured.length > 0
    ? configured
    : undefined;

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
  if (!WAITLIST_ENDPOINT) {
    return { success: false };
  }

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
