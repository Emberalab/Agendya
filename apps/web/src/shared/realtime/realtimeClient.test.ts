import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeEvent } from '@agendya/types';
import { realtimeClient } from './realtimeClient';
import { useAuthStore } from '../../modules/auth/authStore';

const EVENT: RealtimeEvent = {
  type: 'notification.created',
  notification: {
    id: '00000000-0000-4000-8000-0000000000e1',
    type: 'APPOINTMENT_CREATED',
    title: 'Nueva cita',
    body: 'Ana Cliente reservó Corte de cabello · 3 ago 2026, 9:00 a. m.',
    data: {
      bookingId: '00000000-0000-4000-8000-0000000000b1',
      customerName: 'Ana Cliente',
      serviceName: 'Corte de cabello',
      startAt: '2099-08-03T14:00:00.000Z',
    },
    readAt: null,
    createdAt: '2099-08-03T13:55:00.000Z',
  },
};

function sseStreamResponse(frames: string[], keepOpen = false): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < frames.length) {
        controller.enqueue(encoder.encode(frames[i++]));
        return;
      }
      if (!keepOpen) controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('realtimeClient', () => {
  let unsubs: Array<() => void>;

  beforeEach(() => {
    unsubs = [];
    useAuthStore.setState({ accessToken: 'test-token', user: null });
  });

  afterEach(() => {
    unsubs.forEach((u) => u());
    realtimeClient.syncToken(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens the stream with the bearer token and delivers a parsed event', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        sseStreamResponse([`data: ${JSON.stringify(EVENT)}\n\n`], true),
      );
    vi.stubGlobal('fetch', fetchMock);

    const received: RealtimeEvent[] = [];
    unsubs.push(realtimeClient.subscribe((e) => received.push(e)));

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toEqual(EVENT);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/realtime/stream');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-token',
    );
  });

  it('safely ignores heartbeats, non-JSON and unknown events', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseStreamResponse(
            [
              ':\n\n',
              'data: {"t":123}\n\n',
              'data: not-json\n\n',
              'data: {"type":"something.else"}\n\n',
            ],
            true,
          ),
        ),
    );

    const received: RealtimeEvent[] = [];
    unsubs.push(realtimeClient.subscribe((e) => received.push(e)));

    await flush();
    await flush();
    expect(received).toHaveLength(0);
  });

  it('does not connect when there is no auth token', async () => {
    useAuthStore.setState({ accessToken: null, user: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    unsubs.push(realtimeClient.subscribe(() => {}));
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops and logs out on a 401 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );
    const logout = vi.spyOn(useAuthStore.getState(), 'logout');

    unsubs.push(realtimeClient.subscribe(() => {}));

    await vi.waitFor(() => expect(logout).toHaveBeenCalled());
    expect(realtimeClient.getStatus()).toBe('idle');
  });

  it('enters "reconnecting" when the stream ends, then reconnects on tab focus', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sseStreamResponse([], false)) // opens then closes
      .mockResolvedValue(sseStreamResponse([], true)); // stays open on retry
    vi.stubGlobal('fetch', fetchMock);

    unsubs.push(realtimeClient.subscribe(() => {}));

    await vi.waitFor(() =>
      expect(realtimeClient.getStatus()).toBe('reconnecting'),
    );

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
