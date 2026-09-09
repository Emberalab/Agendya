import { MessageEvent } from '@nestjs/common';
import { Subscription, filter, firstValueFrom } from 'rxjs';
import type { Notification } from '@agendya/types';
import { RealtimeService } from './realtime.service';

const NOTIFICATION: Notification = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'APPOINTMENT_CREATED',
  title: 'Nueva cita',
  body: 'Ana reservó Corte de cabello · 3 ago 2026, 9:00 a. m.',
  data: {
    bookingId: '22222222-2222-2222-2222-222222222222',
    customerName: 'Ana',
    serviceName: 'Corte de cabello',
    startAt: '2026-08-03T14:00:00.000Z',
  },
  readAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const EVENT = { type: 'notification.created', notification: NOTIFICATION };

const isNotificationEvent = (message: MessageEvent): boolean =>
  (message.data as { type?: string }).type === 'notification.created';

describe('RealtimeService', () => {
  let service: RealtimeService;
  const subscriptions: Subscription[] = [];

  beforeEach(() => {
    service = new RealtimeService();
  });

  afterEach(() => {
    subscriptions.splice(0).forEach((s) => s.unsubscribe());
  });

  it('delivers a notification.created event to the professional it is addressed to', async () => {
    const received = firstValueFrom(
      service.subscribe('prof-1').pipe(filter(isNotificationEvent)),
    );

    service.emitNotificationCreated('prof-1', NOTIFICATION);

    await expect(received).resolves.toEqual({ data: EVENT });
  });

  it("never leaks one professional's events to another professional's stream", async () => {
    const seenByOther: MessageEvent[] = [];
    subscriptions.push(
      service
        .subscribe('prof-2')
        .pipe(filter(isNotificationEvent))
        .subscribe((m) => seenByOther.push(m)),
    );

    const receivedByTarget = firstValueFrom(
      service.subscribe('prof-1').pipe(filter(isNotificationEvent)),
    );
    service.emitNotificationCreated('prof-1', NOTIFICATION);
    await receivedByTarget;

    expect(seenByOther).toHaveLength(0);
  });

  it('is a silent no-op when the target professional has no open stream', () => {
    expect(() =>
      service.emitNotificationCreated('nobody', NOTIFICATION),
    ).not.toThrow();
  });

  it('fans a single event out to every open stream for the same professional', async () => {
    const first = firstValueFrom(
      service.subscribe('prof-1').pipe(filter(isNotificationEvent)),
    );
    const second = firstValueFrom(
      service.subscribe('prof-1').pipe(filter(isNotificationEvent)),
    );

    service.emitNotificationCreated('prof-1', NOTIFICATION);

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: EVENT },
      { data: EVENT },
    ]);
  });

  it('registers and tears down connections as clients subscribe and disconnect', () => {
    expect(service.connectionCount('prof-1')).toBe(0);

    const sub = service.subscribe('prof-1').subscribe();
    expect(service.connectionCount('prof-1')).toBe(1);

    const sub2 = service.subscribe('prof-1').subscribe();
    expect(service.connectionCount('prof-1')).toBe(2);

    sub.unsubscribe();
    expect(service.connectionCount('prof-1')).toBe(1);

    sub2.unsubscribe();
    expect(service.connectionCount('prof-1')).toBe(0);
  });
});
