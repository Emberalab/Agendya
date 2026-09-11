import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/authStore';
import {
  disablePush,
  enablePush,
  getExistingSubscription,
  getPermission,
  isPushSupported,
} from '../../../shared/push/pushManager';
import { getVapidPublicKey } from '../push';

export const PUSH_PUBLIC_KEY_QUERY = ['notifications', 'push', 'public-key'] as const;

interface UsePushNotifications {
  /** Browser can do Web Push (SW + PushManager + Notification API). */
  supported: boolean;
  /** Server has VAPID keys configured. `undefined` while the check is in flight. */
  serverEnabled: boolean | undefined;
  /** Current `Notification.permission` value. */
  permission: NotificationPermission;
  /** This browser currently holds a push subscription. */
  subscribed: boolean;
  /** An enable/disable call is running. */
  busy: boolean;
  /** Last enable/disable error message, or `null`. */
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/**
 * Drives the "push notifications" toggle in the notification centre. Reconciles
 * three sources of truth — the browser permission, the local `PushManager`
 * subscription, and whether the server even has VAPID keys — into one small
 * state machine the UI can render.
 */
export function usePushNotifications(): UsePushNotifications {
  const token = useAuthStore((state) => state.accessToken);
  const supported = isPushSupported();

  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getPermission(),
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: publicKey, isLoading: keyLoading } = useQuery({
    queryKey: PUSH_PUBLIC_KEY_QUERY,
    queryFn: getVapidPublicKey,
    enabled: Boolean(token) && supported,
    staleTime: Infinity,
  });
  const serverEnabled =
    !supported || keyLoading ? undefined : Boolean(publicKey);

  const refreshSubscription = useCallback(async () => {
    if (!supported) return;
    const existing = await getExistingSubscription();
    setSubscribed(Boolean(existing));
    setPermission(getPermission());
  }, [supported]);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await enablePush();
      if (!ok) {
        setError(
          getPermission() === 'denied'
            ? 'El navegador bloqueó las notificaciones. Actívalas en los ajustes del sitio.'
            : 'No se pudieron activar las notificaciones.',
        );
      }
      await refreshSubscription();
    } catch (err) {
      // Surface the real cause (permission race, `pushManager.subscribe`
      // rejection, a failed `/push/subscribe` POST) for debugging — the user
      // still only sees the friendly string.
      console.error('[push] enable failed', err);
      setError('No se pudieron activar las notificaciones.');
    } finally {
      setBusy(false);
    }
  }, [refreshSubscription]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await disablePush();
      await refreshSubscription();
    } catch {
      setError('No se pudieron desactivar las notificaciones.');
    } finally {
      setBusy(false);
    }
  }, [refreshSubscription]);

  return {
    supported,
    serverEnabled,
    permission,
    subscribed,
    busy,
    error,
    enable,
    disable,
  };
}
