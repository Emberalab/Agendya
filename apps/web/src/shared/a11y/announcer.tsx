import { useAnnouncerStore } from './announcerStore';

/**
 * A single polite live region for the authenticated app. Mount once (dashboard
 * shell). Screen readers announce `message` whenever it changes; the `key` on
 * `nonce` forces a re-announcement even when consecutive messages are equal.
 */
export function Announcer() {
  const message = useAnnouncerStore((state) => state.message);
  const nonce = useAnnouncerStore((state) => state.nonce);

  return (
    <div key={nonce} role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
