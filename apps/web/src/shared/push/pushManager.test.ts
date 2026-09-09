import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getVapidPublicKey: vi.fn(),
  sendPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
}));

vi.mock('../../modules/notifications/push', () => api);

import {
  disablePush,
  enablePush,
  getPermission,
  isPushSupported,
} from './pushManager';

// A valid base64url VAPID key (65 bytes, as browsers emit).
const VAPID_KEY =
  'BMTsS8tGtc9l3IlI8jIRQ3K6XdTk9O1HFKD5-00x8j_vu4Aii_8tj6cC7mYKTHdNkO3qYOwnpKRgEtydaDgEg_k';

interface FakeSub {
  endpoint: string;
  expirationTime: number | null;
  unsubscribe: ReturnType<typeof vi.fn>;
  toJSON: () => { keys: { p256dh: string; auth: string } };
}

function makeSub(endpoint = 'https://push.example/abc'): FakeSub {
  return {
    endpoint,
    expirationTime: null,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({ keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
  };
}

let pushManagerMock: {
  getSubscription: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

function installBrowserPushEnv(permission: NotificationPermission = 'granted') {
  pushManagerMock = {
    getSubscription: vi.fn().mockResolvedValue(null),
    subscribe: vi.fn().mockResolvedValue(makeSub()),
  };
  vi.stubGlobal('navigator', {
    serviceWorker: {
      ready: Promise.resolve({ pushManager: pushManagerMock }),
    },
  });
  vi.stubGlobal(
    'Notification',
    Object.assign(
      vi.fn(),
      {
        permission,
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    ),
  );
  vi.stubGlobal('PushManager', function PushManager() {});
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getVapidPublicKey.mockResolvedValue(VAPID_KEY);
  api.sendPushSubscription.mockResolvedValue(undefined);
  api.deletePushSubscription.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isPushSupported', () => {
  it('is false without a PushManager', () => {
    vi.stubGlobal('navigator', { serviceWorker: {} });
    vi.stubGlobal('Notification', vi.fn());
    expect(isPushSupported()).toBe(false);
  });

  it('is true with SW + PushManager + Notification', () => {
    installBrowserPushEnv();
    expect(isPushSupported()).toBe(true);
    expect(getPermission()).toBe('granted');
  });
});

describe('enablePush', () => {
  it('subscribes with the decoded VAPID key and registers it with the API', async () => {
    installBrowserPushEnv('granted');

    await expect(enablePush()).resolves.toBe(true);

    expect(pushManagerMock.subscribe).toHaveBeenCalledTimes(1);
    const arg = pushManagerMock.subscribe.mock.calls[0][0];
    expect(arg.userVisibleOnly).toBe(true);
    expect(arg.applicationServerKey).toBeInstanceOf(Uint8Array);
    // 65-byte P-256 uncompressed point.
    expect((arg.applicationServerKey as Uint8Array).length).toBe(65);

    expect(api.sendPushSubscription).toHaveBeenCalledWith({
      endpoint: 'https://push.example/abc',
      expirationTime: null,
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    });
  });

  it('reuses an existing browser subscription instead of re-subscribing', async () => {
    installBrowserPushEnv('granted');
    pushManagerMock.getSubscription.mockResolvedValue(
      makeSub('https://push.example/existing'),
    );

    await enablePush();

    expect(pushManagerMock.subscribe).not.toHaveBeenCalled();
    expect(api.sendPushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/existing' }),
    );
  });

  it('returns false and does not subscribe when permission is denied', async () => {
    installBrowserPushEnv('denied');

    await expect(enablePush()).resolves.toBe(false);
    expect(pushManagerMock.subscribe).not.toHaveBeenCalled();
    expect(api.sendPushSubscription).not.toHaveBeenCalled();
  });

  it('returns false when the server has no VAPID key configured', async () => {
    installBrowserPushEnv('granted');
    api.getVapidPublicKey.mockResolvedValue(null);

    await expect(enablePush()).resolves.toBe(false);
    expect(pushManagerMock.subscribe).not.toHaveBeenCalled();
  });
});

describe('disablePush', () => {
  it('unsubscribes locally and tells the API to drop the row', async () => {
    installBrowserPushEnv('granted');
    const sub = makeSub('https://push.example/drop-me');
    pushManagerMock.getSubscription.mockResolvedValue(sub);

    await disablePush();

    expect(sub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.deletePushSubscription).toHaveBeenCalledWith(
      'https://push.example/drop-me',
    );
  });

  it('is a no-op when there is no subscription', async () => {
    installBrowserPushEnv('granted');

    await disablePush();

    expect(api.deletePushSubscription).not.toHaveBeenCalled();
  });
});
