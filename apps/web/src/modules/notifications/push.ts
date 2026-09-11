import type {
  PushSubscribeInput,
  VapidPublicKeyResponse,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

/**
 * REST calls for the Web Push subscription lifecycle. Paired with
 * `shared/push/pushManager.ts`, which does the browser-side work.
 */

export async function getVapidPublicKey(): Promise<string | null> {
  const { data } = await apiClient.get<VapidPublicKeyResponse>(
    '/notifications/push/public-key',
  );
  return data.publicKey;
}

export async function getPushStatus(): Promise<boolean> {
  const { data } = await apiClient.get<{ subscribed: boolean }>(
    '/notifications/push/status',
  );
  return data.subscribed;
}

export async function sendPushSubscription(
  subscription: PushSubscribeInput,
): Promise<void> {
  await apiClient.post('/notifications/push/subscribe', subscription);
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await apiClient.post('/notifications/push/unsubscribe', { endpoint });
}
