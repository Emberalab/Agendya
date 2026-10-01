import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { PushMessage } from '@agendya/types';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';

const activityService = {
  record: jest.fn().mockResolvedValue(undefined),
  recordDailyVisit: jest.fn().mockResolvedValue(undefined),
};
import { PushSubscriptionsService } from './push-subscriptions.service';

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockedWebpush = jest.mocked(webpush);

const VAPID = {
  'webPush.publicKey': 'pub-key',
  'webPush.privateKey': 'priv-key',
  'webPush.subject': 'mailto:test@agendya.app',
} as const;

const MESSAGE: PushMessage = {
  title: 'Nueva cita',
  body: 'Ana reservó Corte',
  notificationId: '11111111-1111-1111-1111-111111111111',
  bookingId: '22222222-2222-2222-2222-222222222222',
  startAt: '2026-08-03T14:00:00.000Z',
};

function subRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    professionalId: 'prof-1',
    endpoint: 'https://push.example/abc',
    p256dh: 'p',
    auth: 'a',
    userAgent: null,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    ...overrides,
  };
}

describe('PushSubscriptionsService', () => {
  let prisma: {
    pushSubscription: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };

  async function build(config: Record<string, string | undefined>) {
    prisma = {
      pushSubscription: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(subRow()),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PushSubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();
    return moduleRef.get(PushSubscriptionsService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with VAPID configured', () => {
    it('registers the VAPID details on construction and exposes the public key', async () => {
      const service = await build({ ...VAPID });
      expect(mockedWebpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@agendya.app',
        'pub-key',
        'priv-key',
      );
      expect(service.publicKey).toBe('pub-key');
    });

    it('upserts a subscription keyed on the endpoint', async () => {
      const service = await build({ ...VAPID });
      await service.subscribe(
        'prof-1',
        {
          endpoint: 'https://push.example/abc',
          keys: { p256dh: 'p', auth: 'a' },
        },
        'Chrome on Android',
      );

      const [[arg]] = prisma.pushSubscription.upsert.mock.calls as [
        [
          {
            where: { endpoint: string };
            create: Record<string, unknown>;
            update: Record<string, unknown>;
          },
        ],
      ];
      expect(arg.where).toEqual({ endpoint: 'https://push.example/abc' });
      expect(arg.create).toMatchObject({
        professionalId: 'prof-1',
        endpoint: 'https://push.example/abc',
        p256dh: 'p',
        auth: 'a',
        userAgent: 'Chrome on Android',
      });
      expect(arg.update).toMatchObject({ professionalId: 'prof-1' });
    });

    it('records PUSH_ENABLED for a newly registered device only', async () => {
      const service = await build({ ...VAPID });
      const input = {
        endpoint: 'https://push.example/abc',
        keys: { p256dh: 'p', auth: 'a' },
      };
      activityService.record.mockClear();

      await service.subscribe('prof-1', input);
      expect(activityService.record).toHaveBeenCalledWith(
        'prof-1',
        'PUSH_ENABLED',
        { entityType: 'PushSubscription', entityId: 'sub-1' },
      );

      // Same device refreshing its keys: not a new event.
      prisma.pushSubscription.findUnique.mockResolvedValue({
        professionalId: 'prof-1',
      });
      await service.subscribe('prof-1', input);
      expect(activityService.record).toHaveBeenCalledTimes(1);
    });

    it('records PUSH_DISABLED only when a device was actually removed', async () => {
      const service = await build({ ...VAPID });
      activityService.record.mockClear();

      await service.unsubscribe('prof-1', 'https://push.example/none');
      expect(activityService.record).not.toHaveBeenCalled();

      prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
      await service.unsubscribe('prof-1', 'https://push.example/abc');
      expect(activityService.record).toHaveBeenCalledWith(
        'prof-1',
        'PUSH_DISABLED',
      );
    });

    it('sends to every registered device', async () => {
      const service = await build({ ...VAPID });
      prisma.pushSubscription.findMany.mockResolvedValue([
        subRow({ endpoint: 'https://push.example/a' }),
        subRow({ id: 'sub-2', endpoint: 'https://push.example/b' }),
      ]);

      await service.sendToProfessional('prof-1', MESSAGE);

      expect(mockedWebpush.sendNotification).toHaveBeenCalledTimes(2);
      const payloads = mockedWebpush.sendNotification.mock.calls.map(
        ([, body]) => JSON.parse(body as string) as PushMessage,
      );
      expect(payloads[0]).toEqual(MESSAGE);
    });

    it('prunes a subscription the push service reports as gone (410)', async () => {
      const service = await build({ ...VAPID });
      prisma.pushSubscription.findMany.mockResolvedValue([
        subRow({ endpoint: 'https://push.example/dead' }),
      ]);
      mockedWebpush.sendNotification.mockRejectedValueOnce(
        Object.assign(new Error('gone'), { statusCode: 410 }),
      );

      await service.sendToProfessional('prof-1', MESSAGE);

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: { in: ['https://push.example/dead'] } },
      });
    });

    it('keeps a subscription on a transient error (500)', async () => {
      const service = await build({ ...VAPID });
      prisma.pushSubscription.findMany.mockResolvedValue([subRow()]);
      mockedWebpush.sendNotification.mockRejectedValueOnce(
        Object.assign(new Error('boom'), { statusCode: 500 }),
      );

      await service.sendToProfessional('prof-1', MESSAGE);

      expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('without VAPID configured', () => {
    it('reports a null public key and never calls the push service', async () => {
      const service = await build({});
      prisma.pushSubscription.findMany.mockResolvedValue([subRow()]);

      expect(service.publicKey).toBeNull();
      await service.sendToProfessional('prof-1', MESSAGE);

      expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
      expect(mockedWebpush.sendNotification).not.toHaveBeenCalled();
    });
  });
});
