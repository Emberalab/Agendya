/**
 * Remembers the customer's contact details on their own device so repeat
 * bookings prefill automatically — no account, no login. It lives in
 * localStorage, so it is per-device / per-browser and never leaves the device
 * or reaches the server. Every access is guarded: private windows, cleared
 * site data, or storage-blocking browsers simply behave as "nothing saved".
 */
const STORAGE_KEY = 'agendya.publicBooking.customer.v1';

export interface SavedCustomer {
  name: string;
  email: string;
  phone: string;
  remember: boolean;
}

const EMPTY: SavedCustomer = {
  name: '',
  email: '',
  phone: '',
  remember: true,
};

export function loadSavedCustomer(): SavedCustomer {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SavedCustomer>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      remember: parsed.remember !== false,
    };
  } catch {
    return EMPTY;
  }
}

export function persistCustomer(data: {
  name: string;
  email: string;
  phone: string;
  remember: boolean;
}): void {
  try {
    if (!data.remember) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        remember: true,
      }),
    );
  } catch {
    // Storage unavailable — the booking still succeeds, just no prefill later.
  }
}
