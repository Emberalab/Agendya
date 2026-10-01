import {
  BACKOFFICE_AUTH_STORAGE_KEY,
  useBackofficeAuthStore,
} from './backofficeAuthStore';

/**
 * Cross-tab glue for sessions that live in sessionStorage ("Recordarme" off),
 * which browsers don't share between tabs:
 *  - a new tab with no session asks open tabs for theirs before rendering;
 *  - logging out in one tab logs out every tab.
 * Remembered sessions live in localStorage and need only the logout part.
 */
const CHANNEL = 'agendya-backoffice-session';
const HANDOFF_WAIT_MS = 150;

type Message =
  { type: 'request' } | { type: 'session'; value: string } | { type: 'logout' };

let channel: BroadcastChannel | null = null;

function storedSession(): string | null {
  try {
    return (
      window.localStorage.getItem(BACKOFFICE_AUTH_STORAGE_KEY) ??
      window.sessionStorage.getItem(BACKOFFICE_AUTH_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

/** Resolves once this tab has a session to render with, or none exists. */
export async function initSessionSync(): Promise<void> {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL);

  channel.onmessage = (event: MessageEvent<Message>) => {
    const message = event.data;
    if (message.type === 'request') {
      const state = useBackofficeAuthStore.getState();
      const value = storedSession();
      // Only hand over a live session.
      if (state.accessToken && value)
        channel?.postMessage({ type: 'session', value });
    } else if (message.type === 'logout') {
      if (useBackofficeAuthStore.getState().accessToken) {
        useBackofficeAuthStore.setState({ accessToken: null, user: null });
      }
    }
  };

  let previousToken = useBackofficeAuthStore.getState().accessToken;
  useBackofficeAuthStore.subscribe((state) => {
    if (previousToken && !state.accessToken)
      channel?.postMessage({ type: 'logout' });
    previousToken = state.accessToken;
  });

  if (useBackofficeAuthStore.getState().accessToken) return;

  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(done, HANDOFF_WAIT_MS);
    const listener = (event: MessageEvent<Message>) => {
      if (event.data.type !== 'session') return;
      try {
        window.sessionStorage.setItem(
          BACKOFFICE_AUTH_STORAGE_KEY,
          event.data.value,
        );
      } catch {
        /* storage blocked — stay logged out */
      }
      void Promise.resolve(useBackofficeAuthStore.persist.rehydrate()).finally(
        () => {
          previousToken = useBackofficeAuthStore.getState().accessToken;
          done();
        },
      );
    };
    function done() {
      window.clearTimeout(timer);
      channel?.removeEventListener('message', listener);
      resolve();
    }
    channel!.addEventListener('message', listener);
    channel!.postMessage({ type: 'request' });
  });
}
