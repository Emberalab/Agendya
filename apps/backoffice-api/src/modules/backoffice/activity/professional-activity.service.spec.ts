import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma.service';
import type { AuditLogService } from '../audit-log/audit-log.service';
import {
  ProfessionalActivityService,
  summarizeWeek,
} from './professional-activity.service';

function eventRow(id: string, occurredAt: string) {
  return {
    id,
    type: 'SERVICE_CREATED',
    category: 'SERVICE',
    actor: 'PROFESSIONAL',
    entityType: 'Service',
    entityId: 'service-1',
    subject: 'Corte',
    metadata: { name: 'Corte' },
    backfilled: false,
    occurredAt: new Date(occurredAt),
  };
}

describe('ProfessionalActivityService.list', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const prisma = {
    professional: { findUnique },
    professionalActivityEvent: { findMany },
  } as unknown as PrismaService;
  const service = new ProfessionalActivityService(
    prisma,
    {} as AuditLogService,
  );
  const baseQuery = { order: 'desc' as const, limit: 2 };

  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue({
      trialStartedAt: new Date('2026-09-01T00:00:00.000Z'),
      trialEndsAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    findMany.mockReset().mockResolvedValue([]);
  });

  it('404s for an unknown professional', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.list('missing', baseQuery)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('always scopes to the professional and applies every filter', async () => {
    await service.list('pro-1', {
      ...baseQuery,
      trialOnly: true,
      category: 'APPOINTMENT',
      type: 'BOOKING_RESCHEDULED',
      actor: 'CUSTOMER',
      entityId: '11111111-1111-4111-8111-111111111111',
      search: 'corte',
      order: 'asc',
    });

    const [[args]] = findMany.mock.calls as [
      [{ where: Record<string, unknown>; orderBy: unknown; take: number }],
    ];
    expect(args.where).toEqual({
      professionalId: 'pro-1',
      occurredAt: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-10-01T00:00:00.000Z'),
      },
      category: 'APPOINTMENT',
      type: 'BOOKING_RESCHEDULED',
      actor: 'CUSTOMER',
      entityId: '11111111-1111-4111-8111-111111111111',
      subject: { contains: 'corte', mode: 'insensitive' },
    });
    expect(args.orderBy).toEqual([{ occurredAt: 'asc' }, { id: 'asc' }]);
    expect(args.take).toBe(3);
  });

  it('returns an empty page without querying when trialOnly has no trial', async () => {
    findUnique.mockResolvedValue({ trialStartedAt: null, trialEndsAt: null });

    await expect(
      service.list('pro-1', { ...baseQuery, trialOnly: true }),
    ).resolves.toEqual({ items: [], nextCursor: null });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('pages with a keyset cursor', async () => {
    findMany.mockResolvedValue([
      eventRow('e3', '2026-09-03T00:00:00.000Z'),
      eventRow('e2', '2026-09-02T00:00:00.000Z'),
      eventRow('e1', '2026-09-01T00:00:00.000Z'),
    ]);

    const page = await service.list('pro-1', { ...baseQuery, cursor: 'e4' });

    expect(page.items.map((item) => item.id)).toEqual(['e3', 'e2']);
    expect(page.nextCursor).toBe('e2');
    expect(page.items[0].occurredAt).toBe('2026-09-03T00:00:00.000Z');
    const [[args]] = findMany.mock.calls as [
      [{ cursor: unknown; skip: number }],
    ];
    expect(args.cursor).toEqual({ id: 'e4' });
    expect(args.skip).toBe(1);
  });
});

describe('summarizeWeek', () => {
  it('groups blocks per weekday, Sunday first and sorted', () => {
    expect(
      summarizeWeek([
        { dayOfWeek: 'MONDAY', startMinute: 840, endMinute: 1080 },
        { dayOfWeek: 'SUNDAY', startMinute: 600, endMinute: 720 },
        { dayOfWeek: 'MONDAY', startMinute: 480, endMinute: 720 },
      ]),
    ).toEqual([
      { dayOfWeek: 'SUNDAY', blocks: [[600, 720]] },
      {
        dayOfWeek: 'MONDAY',
        blocks: [
          [480, 720],
          [840, 1080],
        ],
      },
    ]);
  });
});
