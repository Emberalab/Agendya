import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Booking } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionsService } from './push-subscriptions.service';

const PROFESSIONAL = { id: 'prof-1', timezone: 'America/Bogota' };

const BOOKING = {
  id: '22222222-2222-2222-2222-222222222222',
  customerName: 'Ana',
  serviceNameSnapshot: 'Corte de cabello',
  startAt: new Date('2026-08-03T14:00:00.000Z'),
} as unknown as Booking;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? '11111111-1111-1111-1111-111111111111',
    professionalId: 'prof-1',
    type: 'APPOINTMENT_CREATED',
    title: 'Nueva cita',
    body: 'Ana reservó Corte de cabello · 3 ago 2026, 9:00 a. m.',
    data: {
      bookingId: BOOKING.id,
      customerName: 'Ana',
      serviceName: 'Corte de cabello',
      startAt: '2026-08-03T14:00:00.000Z',
    },
    readAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let realtime: { emitNotificationCreated: jest.Mock };
  let push: { sendToProfessional: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    realtime = { emitNotificationCreated: jest.fn() };
    push = { sendToProfessional: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RealtimeService, useValue: realtime },
        { provide: PushSubscriptionsService, useValue: push },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  describe('notifyAppointmentCreated', () => {
    it('persists an APPOINTMENT_CREATED row for the professional and emits it', async () => {
      prisma.notification.create.mockResolvedValue(row());

      await service.notifyAppointmentCreated(PROFESSIONAL, BOOKING);

      const [[createArg]] = prisma.notification.create.mock.calls as [
        [{ data: Record<string, unknown> }],
      ];
      expect(createArg.data).toMatchObject({
        professionalId: 'prof-1',
        type: 'APPOINTMENT_CREATED',
        title: 'Nueva cita',
      });
      expect(createArg.data.data).toEqual({
        bookingId: BOOKING.id,
        customerName: 'Ana',
        serviceName: 'Corte de cabello',
        startAt: '2026-08-03T14:00:00.000Z',
      });
      expect(String(createArg.data.body)).toContain('Ana');
      expect(String(createArg.data.body)).toContain('Corte de cabello');

      expect(realtime.emitNotificationCreated).toHaveBeenCalledTimes(1);
      const [[professionalId, dto]] = realtime.emitNotificationCreated.mock
        .calls as [[string, { id: string; readAt: null }]];
      expect(professionalId).toBe('prof-1');
      expect(dto.readAt).toBeNull();

      expect(push.sendToProfessional).toHaveBeenCalledTimes(1);
      const [[pushProfId, message]] = push.sendToProfessional.mock.calls as [
        [string, { title: string; bookingId: string; notificationId: string }],
      ];
      expect(pushProfId).toBe('prof-1');
      expect(message.bookingId).toBe(BOOKING.id);
      expect(message.notificationId).toBe(dto.id);
    });

    it('never throws or emits when the insert fails', async () => {
      prisma.notification.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.notifyAppointmentCreated(PROFESSIONAL, BOOKING),
      ).resolves.toBeUndefined();
      expect(realtime.emitNotificationCreated).not.toHaveBeenCalled();
      expect(push.sendToProfessional).not.toHaveBeenCalled();
    });

    it('still resolves when the push fan-out rejects', async () => {
      prisma.notification.create.mockResolvedValue(row());
      push.sendToProfessional.mockRejectedValue(new Error('push down'));

      await expect(
        service.notifyAppointmentCreated(PROFESSIONAL, BOOKING),
      ).resolves.toBeUndefined();
      expect(realtime.emitNotificationCreated).toHaveBeenCalledTimes(1);
    });

    it('flags an at-home booking in the title and data, without the address', async () => {
      prisma.notification.create.mockResolvedValue(row());

      await service.notifyAppointmentCreated(PROFESSIONAL, {
        ...BOOKING,
        atHome: true,
        customerAddress: 'Calle 10 #43C-20 (Ref.: portón negro)',
      });

      const [[createArg]] = prisma.notification.create.mock.calls as [
        [{ data: Record<string, unknown> }],
      ];
      expect(createArg.data.title).toBe('Nueva cita a domicilio');
      expect(createArg.data.data).toEqual({
        bookingId: BOOKING.id,
        customerName: 'Ana',
        serviceName: 'Corte de cabello',
        startAt: '2026-08-03T14:00:00.000Z',
        atHome: true,
      });
      // The address never rides along in the payload.
      expect(JSON.stringify(createArg.data)).not.toContain('Calle 10');
      expect(JSON.stringify(createArg.data)).not.toContain('portón negro');
    });
  });

  describe('list', () => {
    it('scopes to the professional and requests one extra row for the cursor', async () => {
      prisma.notification.findMany.mockResolvedValue([row()]);

      const result = await service.list('prof-1', { limit: 20 });

      const [[findArg]] = prisma.notification.findMany.mock.calls as [
        [{ where: Record<string, unknown>; take: number; orderBy: unknown }],
      ];
      expect(findArg.where).toEqual({ professionalId: 'prof-1' });
      expect(findArg.take).toBe(21);
      expect(findArg.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('returns a nextCursor when there is another page and follows it', async () => {
      const page1 = Array.from({ length: 3 }, (_, i) =>
        row({
          id: `n${i}`,
          createdAt: new Date(`2026-08-0${3 - i}T00:00:00.000Z`),
        }),
      );
      prisma.notification.findMany.mockResolvedValueOnce(page1);

      const first = await service.list('prof-1', { limit: 2 });
      expect(first.items.map((n) => n.id)).toEqual(['n0', 'n1']);
      expect(first.nextCursor).toBeTruthy();

      prisma.notification.findMany.mockResolvedValueOnce([]);
      await service.list('prof-1', {
        limit: 2,
        cursor: first.nextCursor as string,
      });

      const calls = prisma.notification.findMany.mock.calls as [
        [{ where: { professionalId: string; OR: unknown[] } }],
        [{ where: { professionalId: string; OR: unknown[] } }],
      ];
      const [secondCall] = calls[1];
      expect(secondCall.where.professionalId).toBe('prof-1');
      expect(secondCall.where.OR).toHaveLength(2);
    });

    it('ignores a malformed cursor instead of throwing', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      await expect(
        service.list('prof-1', { limit: 20, cursor: 'not-base64!!' }),
      ).resolves.toEqual({ items: [], nextCursor: null });
      const [[findArg]] = prisma.notification.findMany.mock.calls as [
        [{ where: Record<string, unknown> }],
      ];
      expect(findArg.where).toEqual({ professionalId: 'prof-1' });
    });
  });

  describe('unreadCount', () => {
    it("counts only this professional's unread rows", async () => {
      prisma.notification.count.mockResolvedValue(4);
      await expect(service.unreadCount('prof-1')).resolves.toBe(4);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1', readAt: null },
      });
    });
  });

  describe('markRead', () => {
    it('marks the row read, scoped by professional in the where clause', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      prisma.notification.findFirst.mockResolvedValue(
        row({ readAt: new Date('2026-08-02T00:00:00.000Z') }),
      );

      const result = await service.markRead('prof-1', 'n1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', professionalId: 'prof-1', readAt: null },
        data: { readAt: expect.any(Date) as unknown },
      });
      expect(result.readAt).toBe('2026-08-02T00:00:00.000Z');
    });

    it('404s when the notification belongs to another professional', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markRead('prof-1', 'someone-elses')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is idempotent for an already-read notification', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });
      prisma.notification.findFirst.mockResolvedValue(
        row({ id: 'n1', readAt: new Date('2026-08-02T00:00:00.000Z') }),
      );

      await expect(service.markRead('prof-1', 'n1')).resolves.toMatchObject({
        id: 'n1',
        readAt: '2026-08-02T00:00:00.000Z',
      });
    });
  });

  describe('markAllRead', () => {
    it('marks every unread row for this professional and returns the count', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 7 });

      await expect(service.markAllRead('prof-1')).resolves.toEqual({
        updated: 7,
      });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1', readAt: null },
        data: { readAt: expect.any(Date) as unknown },
      });
    });
  });

  describe('deleteRead (single)', () => {
    it('scopes the delete to the owner and to already-read rows', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.deleteRead('prof-1', 'n-9')).resolves.toEqual({
        deleted: 1,
      });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'n-9', professionalId: 'prof-1', readAt: { not: null } },
      });
    });

    it('reports 0 (not an error) when nothing matched — unknown, not owned, or unread', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.deleteRead('prof-1', 'n-x')).resolves.toEqual({
        deleted: 0,
      });
    });
  });

  describe('deleteAllRead (bulk)', () => {
    it("deletes only this professional's read rows and returns the count", async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 4 });

      await expect(service.deleteAllRead('prof-1')).resolves.toEqual({
        deleted: 4,
      });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { professionalId: 'prof-1', readAt: { not: null } },
      });
    });
  });
});
