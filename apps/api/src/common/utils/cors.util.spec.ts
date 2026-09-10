import { isAllowedOrigin } from './cors.util';

const WEB_URL = 'http://localhost:5173';

describe('isAllowedOrigin', () => {
  it('allows the configured frontend origin', () => {
    expect(isAllowedOrigin(WEB_URL, WEB_URL)).toBe(true);
  });

  it('allows localhost and 127.0.0.1 regardless of port', () => {
    expect(isAllowedOrigin('http://localhost:5173', WEB_URL)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5173', WEB_URL)).toBe(true);
  });

  // Regression test: `npm run dev:web:host` (README/CLAUDE.md) opens the
  // frontend from a LAN IP rather than `webUrl` — CORS must keep allowing
  // that flow after locking origin down from the previous wildcard `*`.
  it('allows a private-network (LAN) origin', () => {
    expect(isAllowedOrigin('http://192.168.1.50:5173', WEB_URL)).toBe(true);
    expect(isAllowedOrigin('http://10.0.0.5:5173', WEB_URL)).toBe(true);
    expect(isAllowedOrigin('http://172.16.0.5:5173', WEB_URL)).toBe(true);
  });

  // Regression test for the CORS-misconfiguration finding: `app.enableCors()`
  // with no options reflected any Origin (effectively `*`). A public
  // internet origin must now be rejected.
  it('rejects an arbitrary public internet origin', () => {
    expect(isAllowedOrigin('https://evil-attacker.example', WEB_URL)).toBe(
      false,
    );
    expect(isAllowedOrigin('https://8.8.8.8', WEB_URL)).toBe(false);
  });

  it('allows any of several configured frontend origins', () => {
    expect(
      isAllowedOrigin('https://app.agendya.co', [
        'https://app.agendya.co',
        'https://agendya.co',
      ]),
    ).toBe(true);
    expect(
      isAllowedOrigin('https://agendya.co', [
        'https://app.agendya.co',
        'https://agendya.co',
      ]),
    ).toBe(true);
  });

  it('still rejects a public origin that is not in the allow-list', () => {
    expect(
      isAllowedOrigin('https://evil-attacker.example', [
        'https://app.agendya.co',
        'https://agendya.co',
      ]),
    ).toBe(false);
  });

  it('rejects a malformed origin', () => {
    expect(isAllowedOrigin('not-a-url', WEB_URL)).toBe(false);
  });

  it('rejects a non-http(s) scheme even on a private host', () => {
    expect(isAllowedOrigin('file://localhost', WEB_URL)).toBe(false);
  });
});
