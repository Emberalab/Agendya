import { ActivityService, diffFields } from './activity.service';
import type { PrismaService } from '../../database/prisma.service';

describe('ActivityService', () => {
  const create = jest.fn();
  const createMany = jest.fn();
  const prisma = {
    professionalActivityEvent: { create, createMany },
  } as unknown as PrismaService;

  beforeEach(() => {
    create.mockReset().mockResolvedValue({});
    createMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it('stores the category derived from the type and defaults the actor', async () => {
    const service = new ActivityService(prisma);

    await service.record('pro-1', 'BOOKING_RESCHEDULED', {
      entityType: 'Booking',
      entityId: 'b-1',
      subject: 'Corte',
      metadata: { from: 'a', to: 'b' },
    });

    expect(create).toHaveBeenCalledTimes(1);
    const [[args]] = create.mock.calls as [[{ data: Record<string, unknown> }]];
    expect(args.data).toMatchObject({
      professionalId: 'pro-1',
      type: 'BOOKING_RESCHEDULED',
      category: 'APPOINTMENT',
      actor: 'PROFESSIONAL',
      entityType: 'Booking',
      entityId: 'b-1',
      subject: 'Corte',
      metadata: { from: 'a', to: 'b' },
    });
  });

  it('never throws when the insert fails', async () => {
    create.mockRejectedValueOnce(new Error('db down'));
    const service = new ActivityService(prisma);

    await expect(
      service.record('pro-1', 'SERVICE_CREATED'),
    ).resolves.toBeUndefined();
  });

  it('records one visit per professional per local day', async () => {
    const service = new ActivityService(prisma);
    const professional = { id: 'pro-1', timezone: 'America/Bogota' };
    // 2026-09-30 23:30 in Bogotá (UTC-5) is already Oct 1 in UTC.
    const lateEvening = new Date('2026-10-01T04:30:00Z');

    await service.recordDailyVisit(professional, lateEvening);
    await service.recordDailyVisit(professional, lateEvening);

    expect(createMany).toHaveBeenCalledTimes(1);
    const [[args]] = createMany.mock.calls as [
      [{ data: { dedupeKey: string }[]; skipDuplicates: boolean }],
    ];
    expect(args.data[0].dedupeKey).toBe('visit:pro-1:2026-09-30');
    expect(args.skipDuplicates).toBe(true);

    await service.recordDailyVisit(
      professional,
      new Date('2026-10-01T15:00:00Z'),
    );
    expect(createMany).toHaveBeenCalledTimes(2);
  });

  it('retries a visit on the next call when the insert failed', async () => {
    createMany.mockRejectedValueOnce(new Error('db down'));
    const service = new ActivityService(prisma);
    const professional = { id: 'pro-1', timezone: 'UTC' };
    const now = new Date('2026-09-30T12:00:00Z');

    await service.recordDailyVisit(professional, now);
    await service.recordDailyVisit(professional, now);

    expect(createMany).toHaveBeenCalledTimes(2);
  });
});

describe('diffFields', () => {
  const before = { name: 'Corte', priceCents: 20000, description: 'Largo' };

  it('returns only fields present in the input that changed', () => {
    expect(
      diffFields(before, { name: 'Corte', priceCents: 25000 }, [
        'name',
        'priceCents',
        'description',
      ]),
    ).toEqual({ priceCents: { from: 20000, to: 25000 } });
  });

  it('hides the values of opaque fields', () => {
    expect(
      diffFields(
        before,
        { description: 'Corto' },
        ['description'],
        ['description'],
      ),
    ).toEqual({ description: { changed: true } });
  });

  it('treats null and undefined previous values alike', () => {
    expect(
      diffFields({ category: null as string | null }, { category: null }, [
        'category',
      ]),
    ).toEqual({});
  });
});
