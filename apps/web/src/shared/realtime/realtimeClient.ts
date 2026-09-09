import { realtimeEventSchema, type RealtimeEvent } from '@agendya/types';
import { apiBaseUrl } from '../api/apiClient';
import { useAuthStore } from '../../modules/auth/authStore';

/**
 * Single, shared Server-Sent Events connection to `GET /realtime/stream`.
 *
 * Why a hand-rolled `fetch` reader instead of the browser `EventSource`:
 * `EventSource` cannot send an `Authorization` header, which would force the
 * JWT into the query string (a second, weaker auth path). With `fetch` the
 * token rides in the same `Authorization: Bearer` header the REST client uses,
 * so the server authenticates the stream with the exact same `JwtAuthGuard`.
 *
 * Design rules this implements:
 *  - one connection process-wide, ref-counted by `subscribe()`;
 *  - the app works normally if the stream is down — every failure is swallowed
 *    and the dashboard still reconciles through the REST agenda query;
 *  - bounded exponential backoff with jitter, slower while the tab is hidden,
 *    reset on a healthy connection — never a tight reconnect loop;
 *  - reconnects immediately when a hidden tab becomes visible again;
 *  - stops on logout / 401 (session expiry) and never reconnects without a
 *    token.
 */

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting';

type EventListener = (event: RealtimeEvent) => void;
type StatusListener = (status: RealtimeStatus) => void;

const STREAM_PATH = '/realtime/stream';
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_ATTEMPT_EXPONENT = 5; // 2^5 * 1s = 32s -> capped at MAX_BACKOFF_MS
const STOP_GRACE_MS = 150; // absorb StrictMode / fast route remounts

class RealtimeClient {
  private readonly listeners = new Set<EventListener>();
  private readonly statusListeners = new Set<StatusListener>();

  private controller: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private attempt = 0;
  private connectedToken: string | null = null;
  private status: RealtimeStatus = 'idle';
  private visibilityBound = false;

  /**
   * Register an event listener and ensure the connection is running. Returns an
   * unsubscribe function; the connection closes once the last listener leaves.
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        // Defer the teardown so a component that unmounts and immediately
        // remounts (React StrictMode, route transitions) keeps one connection.
        this.stopTimer = setTimeout(() => {
          this.stopTimer = null;
          if (this.listeners.size === 0) this.stop();
        }, STOP_GRACE_MS);
      }
    };
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  /**
   * Point the connection at the current auth token. Call on login and whenever
   * the token changes; a no-op if the token is unchanged and already connected.
   */
  syncToken(token: string | null): void {
    if (!token) {
      this.stop();
      return;
    }
    if (token !== this.connectedToken) {
      this.stop();
      if (this.listeners.size > 0) this.start();
    } else {
      this.start();
    }
  }

  private start(): void {
    if (this.running) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    this.running = true;
    this.attempt = 0;
    this.bindVisibility();
    void this.connect();
  }

  private stop(): void {
    this.running = false;
    this.attempt = 0;
    this.connectedToken = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.controller?.abort();
    this.controller = null;
    this.setStatus('idle');
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (
        document.visibilityState === 'visible' &&
        this.running &&
        !this.controller
      ) {
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.attempt = 0;
        void this.connect();
      }
    });
  }

  private async connect(): Promise<void> {
    if (!this.running) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      this.stop();
      return;
    }

    const controller = new AbortController();
    this.controller = controller;
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting');

    try {
      const response = await fetch(
        // Concatenate: `apiBaseUrl` may carry a base path (`/api`) that
        // `new URL(STREAM_PATH, apiBaseUrl)` would discard.
        `${apiBaseUrl}${STREAM_PATH}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          cache: 'no-store',
          signal: controller.signal,
        },
      );

      if (response.status === 401) {
        // Session expired/invalid. Mirror apiClient's REST 401 behaviour.
        this.stop();
        useAuthStore.getState().logout();
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(`realtime stream HTTP ${response.status}`);
      }

      this.attempt = 0;
      this.connectedToken = token;
      this.setStatus('open');
      await this.readStream(response.body);
      // The stream ended without an error (server closed / proxy timeout).
      if (this.running && !controller.signal.aborted) this.scheduleReconnect();
    } catch {
      if (this.running && !controller.signal.aborted) this.scheduleReconnect();
    } finally {
      if (this.controller === controller) this.controller = null;
    }
  }

  private async readStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        this.handleFrame(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }
  }

  private handleFrame(frame: string): void {
    const data = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data) return; // comment / heartbeat-only frame

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    const result = realtimeEventSchema.safeParse(parsed);
    if (!result.success) return; // unknown / malformed event -> ignore safely

    for (const listener of this.listeners) {
      try {
        listener(result.data);
      } catch {
        // one listener throwing must not stop the others
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.running || this.reconnectTimer) return;
    this.setStatus('reconnecting');

    const hidden =
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden';
    const exponent = Math.min(this.attempt, MAX_ATTEMPT_EXPONENT);
    const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** exponent);
    const jitter = backoff * 0.3 * Math.random();
    const wait = hidden ? MAX_BACKOFF_MS : backoff + jitter;

    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, wait);
  }

  private setStatus(status: RealtimeStatus): void {
    if (status === this.status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch {
        /* isolate */
      }
    }
  }
}

export const realtimeClient = new RealtimeClient();
