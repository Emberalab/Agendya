import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush, {
  type PushSubscription as WebPushSubscription,
} from 'web-push';
import type { PushMessage, PushSubscribeInput } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';

/**
 * Stores browser Web Push subscriptions and fans a {@link PushMessage} out to
 * every device a professional has registered. Mirrors `MailService`'s
 * graceful-degradation contract: with no VAPID keys configured it is inert —
 * `publicKey` is `null`, `subscribe()` still records rows (harmless), and
 * `sendToProfessional()` is a no-op — so the notification feed keeps working
 * over SSE + the persisted row.
 *
 * All operations are scoped to a `professionalId` the caller takes from the
 * authenticated request, never from client input.
 */
@Injectable()
export class PushSubscriptionsService {
  private readonly logger = new Logger(PushSubscriptionsService.name);
  private readonly vapidPublicKey: string | null;
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const publicKey = config.get<string>('webPush.publicKey');
    const privateKey = config.get<string>('webPush.privateKey');
    const subject = config.get<string>('webPush.subject');

    this.enabled = Boolean(publicKey && privateKey && subject);
    this.vapidPublicKey = this.enabled ? (publicKey as string) : null;

    if (this.enabled) {
      webpush.setVapidDetails(
        subject as string,
        publicKey as string,
        privateKey as string,
      );
    } else {
      this.logger.warn(
        'VAPID keys not configured — Web Push delivery is disabled. Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT to enable it.',
      );
    }
  }

  /** The VAPID public key for `pushManager.subscribe()`, or `null` if disabled. */
  get publicKey(): string | null {
    return this.vapidPublicKey;
  }

  /**
   * Records (or refreshes) one subscription. Keyed on the globally-unique
   * `endpoint`, so a browser that re-subscribes updates its row rather than
   * creating a duplicate, and a device that switched accounts is reassigned to
   * the current professional.
   */
  async subscribe(
    professionalId: string,
    input: PushSubscribeInput,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        professionalId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        professionalId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent ?? null,
        lastActiveAt: new Date(),
      },
    });
  }

  /** Drops one subscription. Scoped so a professional can only remove their own. */
  async unsubscribe(professionalId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, professionalId },
    });
  }

  /** Whether the professional has at least one registered device. */
  async hasSubscription(professionalId: string): Promise<boolean> {
    const count = await this.prisma.pushSubscription.count({
      where: { professionalId },
    });
    return count > 0;
  }

  /**
   * Delivers `message` to every device the professional registered. Best-effort:
   * a `404`/`410` from the push service means the subscription is dead, so the
   * row is pruned; anything else is logged and swallowed. Never throws — callers
   * fire-and-forget this after the `Notification` row is already committed.
   */
  async sendToProfessional(
    professionalId: string,
    message: PushMessage,
  ): Promise<void> {
    if (!this.enabled) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { professionalId },
    });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify(message);
    const stale: string[] = [];
    const delivered: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const target: WebPushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          await webpush.sendNotification(target, payload);
          delivered.push(sub.endpoint);
        } catch (error) {
          const statusCode =
            error && typeof error === 'object' && 'statusCode' in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            stale.push(sub.endpoint);
          } else {
            this.logger.warn(
              `Web Push a prof=${professionalId} falló (status ${statusCode ?? 'desconocido'})`,
            );
          }
        }
      }),
    );

    // One line per fan-out so delivery is visible in the API log without
    // needing a DB probe — the push service accepting a payload (this count)
    // is as far as the server can see; whether the OS then shows a banner is
    // between the browser vendor's push service and the recipient's OS.
    this.logger.log(
      `Web Push prof=${professionalId} notif=${message.notificationId}: ` +
        `entregadas=${delivered.length} obsoletas=${stale.length} ` +
        `fallidas=${subscriptions.length - delivered.length - stale.length}`,
    );

    if (delivered.length > 0) {
      await this.prisma.pushSubscription
        .updateMany({
          where: { endpoint: { in: delivered } },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => undefined);
    }
    if (stale.length > 0) {
      await this.prisma.pushSubscription
        .deleteMany({ where: { endpoint: { in: stale } } })
        .catch(() => undefined);
      this.logger.debug(
        `Podadas ${stale.length} suscripción(es) push muertas de prof=${professionalId}`,
      );
    }
  }
}
