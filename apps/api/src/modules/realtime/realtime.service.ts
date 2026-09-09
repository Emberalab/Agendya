import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval, map, merge } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type { Notification, RealtimeEvent } from '@agendya/types';

/**
 * Milliseconds between keep-alive frames. Long-lived SSE responses are dropped
 * by many reverse proxies / load balancers after ~30–60s of silence; a periodic
 * `event: ping` frame keeps the connection warm. Overridable so a deployment
 * behind a stricter proxy can shorten it.
 */
const HEARTBEAT_MS = Number(process.env.REALTIME_HEARTBEAT_MS ?? 25_000);

/**
 * In-process fan-out of real-time events to the professionals currently holding
 * an open SSE stream. This is a **delivery channel only** — the persistent
 * `Notification` row (written by `NotificationsService`) is the source of
 * truth. A client that was disconnected when an event fired recovers the same
 * information from `GET /notifications` on reconnect.
 *
 * Scope is always a single professional id, taken from the authenticated
 * request server-side (see {@link RealtimeController}). There is no
 * client-addressable channel name, so a professional cannot subscribe to
 * another professional's events.
 *
 * Single-instance only. Horizontal scaling needs a shared bus (Postgres
 * LISTEN/NOTIFY on the existing pool, or Redis pub/sub) feeding `publish()` on
 * every instance — see the module README / final report.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  /** professionalId -> set of live per-connection subjects. */
  private readonly streams = new Map<string, Set<Subject<MessageEvent>>>();

  /**
   * Opens a stream for one professional. The returned observable also carries
   * periodic `ping` heartbeats and de-registers itself when the client
   * disconnects (the `finalize` runs on unsubscribe, which Nest triggers when
   * the HTTP response closes).
   */
  subscribe(professionalId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    let connections = this.streams.get(professionalId);
    if (!connections) {
      connections = new Set();
      this.streams.set(professionalId, connections);
    }
    connections.add(subject);

    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: { t: Date.now() } })),
    );

    return merge(subject.asObservable(), heartbeat).pipe(
      finalize(() => {
        const set = this.streams.get(professionalId);
        if (set) {
          set.delete(subject);
          if (set.size === 0) {
            this.streams.delete(professionalId);
          }
        }
        subject.complete();
      }),
    );
  }

  /** Push a `notification.created` event to one professional's open streams. */
  emitNotificationCreated(
    professionalId: string,
    notification: Notification,
  ): void {
    this.publish(professionalId, {
      type: 'notification.created',
      notification,
    });
  }

  private publish(professionalId: string, event: RealtimeEvent): void {
    const connections = this.streams.get(professionalId);
    if (!connections || connections.size === 0) {
      return;
    }
    const message: MessageEvent = { data: event };
    for (const subject of connections) {
      try {
        subject.next(message);
      } catch (error) {
        this.logger.warn(
          `Failed to push ${event.type} to a stream for prof=${professionalId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  /** Test/observability helper: open connection count for a professional. */
  connectionCount(professionalId: string): number {
    return this.streams.get(professionalId)?.size ?? 0;
  }
}
