import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

const WEEKDAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

function futureDate(daysFromNow: number): {
  dateStr: string;
  weekday: (typeof WEEKDAY_NAMES)[number];
} {
  const target = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const dateStr = target.toISOString().slice(0, 10);
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekday =
    WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return { dateStr, weekday };
}

interface NotificationBody {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { bookingId: string; customerName: string; serviceName: string };
  readAt: string | null;
  createdAt: string;
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `e2e-notif-${runId}@agendya.test`;
  const otherEmail = `e2e-notif-other-${runId}@agendya.test`;
  const password = 'supersecret123';

  let tokenA: string;
  let tokenB: string;
  let slugA: string;
  let serviceIdA: string;
  let serviceIdHomeA: string;

  const day = futureDate(14);
  const authA = () => ({ Authorization: `Bearer ${tokenA}` });
  const authB = () => ({ Authorization: `Bearer ${tokenB}` });

  async function book(hhmm: string, customerName: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/public/professionals/${slugA}/bookings`)
      .send({
        serviceIds: serviceIdA,
        startAt: `${day.dateStr}T${hhmm}:00.000Z`,
        customerName,
        customerEmail: 'cliente@example.com',
        customerPhone: '+57 300 1234567',
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function bookHome(
    hhmm: string,
    customerName: string,
    customerAddress: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/public/professionals/${slugA}/bookings`)
      .send({
        serviceIds: serviceIdHomeA,
        startAt: `${day.dateStr}T${hhmm}:00.000Z`,
        customerName,
        customerEmail: 'cliente@example.com',
        customerPhone: '+57 300 1234567',
        atHome: true,
        customerAddress,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const regA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName: `E2E Notif ${runId}` });
    tokenA = (regA.body as { accessToken: string }).accessToken;
    slugA = (regA.body as { user: { slug: string } }).user.slug;

    const regB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        password,
        businessName: `E2E Notif Otro ${runId}`,
      });
    tokenB = (regB.body as { accessToken: string }).accessToken;

    const svc = await request(app.getHttpServer())
      .post('/services')
      .set(authA())
      .send({
        name: 'Corte de cabello',
        durationMinutes: 30,
        priceCents: 2000000,
      });
    serviceIdA = (svc.body as { id: string }).id;

    const homeSvc = await request(app.getHttpServer())
      .post('/services')
      .set(authA())
      .send({
        name: 'Corte a domicilio',
        durationMinutes: 30,
        priceCents: 2000000,
        homeServiceEnabled: true,
        homeDurationMinutes: 45,
        homePriceCents: 2500000,
      });
    serviceIdHomeA = (homeSvc.body as { id: string }).id;

    await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set(authA())
      .send({
        days: [{ dayOfWeek: day.weekday, startMinute: 480, endMinute: 1080 }],
      })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { professional: { email: { in: [email, otherEmail] } } },
    });
    await prisma.booking.deleteMany({
      where: { professional: { email: { in: [email, otherEmail] } } },
    });
    await prisma.professional.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await app.close();
  });

  it('rejects unauthenticated access to every notification endpoint', async () => {
    const server = app.getHttpServer();
    await request(server).get('/notifications').expect(401);
    await request(server).get('/notifications/unread-count').expect(401);
    await request(server).patch('/notifications/some-id/read').expect(401);
    await request(server).patch('/notifications/read-all').expect(401);
    await request(server).delete('/notifications/read').expect(401);
    await request(server).delete('/notifications/some-id').expect(401);
  });

  it('records an APPOINTMENT_CREATED notification for the booking owner only', async () => {
    const bookingId = await book('15:00', 'Ana Uno');

    const listA = await request(app.getHttpServer())
      .get('/notifications')
      .set(authA())
      .expect(200);
    const items = (listA.body as { items: NotificationBody[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'APPOINTMENT_CREATED',
      title: 'Nueva cita',
      readAt: null,
    });
    expect(items[0].data.bookingId).toBe(bookingId);
    expect(items[0].data.customerName).toBe('Ana Uno');
    expect(items[0].body).toContain('Ana Uno');
    // no contact details leak into the feed row
    expect(JSON.stringify(items[0].data)).not.toContain('cliente@example.com');
    expect(JSON.stringify(items[0].data)).not.toContain('+57 300 1234567');

    const listB = await request(app.getHttpServer())
      .get('/notifications')
      .set(authB())
      .expect(200);
    expect((listB.body as { items: NotificationBody[] }).items).toHaveLength(0);
  });

  it('reports the unread count per professional', async () => {
    const a = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((a.body as { count: number }).count).toBe(1);

    const b = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authB())
      .expect(200);
    expect((b.body as { count: number }).count).toBe(0);
  });

  it("does not let a professional mark another professional's notification read", async () => {
    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set(authA())
      .expect(200);
    const notifId = (list.body as { items: NotificationBody[] }).items[0].id;

    await request(app.getHttpServer())
      .patch(`/notifications/${notifId}/read`)
      .set(authB())
      .expect(404);

    const stillUnread = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((stillUnread.body as { count: number }).count).toBe(1);
  });

  it('marks a single notification read for its owner', async () => {
    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set(authA())
      .expect(200);
    const notifId = (list.body as { items: NotificationBody[] }).items[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/notifications/${notifId}/read`)
      .set(authA())
      .expect(200);
    expect((res.body as NotificationBody).readAt).not.toBeNull();

    const count = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((count.body as { count: number }).count).toBe(0);
  });

  it('paginates with an opaque cursor', async () => {
    await book('15:30', 'Ana Dos');
    await book('16:00', 'Ana Tres');

    const page1 = await request(app.getHttpServer())
      .get('/notifications?limit=2')
      .set(authA())
      .expect(200);
    const body1 = page1.body as {
      items: NotificationBody[];
      nextCursor: string | null;
    };
    expect(body1.items).toHaveLength(2);
    expect(body1.nextCursor).toBeTruthy();

    const page2 = await request(app.getHttpServer())
      .get(
        `/notifications?limit=2&cursor=${encodeURIComponent(body1.nextCursor!)}`,
      )
      .set(authA())
      .expect(200);
    const body2 = page2.body as {
      items: NotificationBody[];
      nextCursor: string | null;
    };
    expect(body2.items.length).toBeGreaterThanOrEqual(1);

    const page1Ids = new Set(body1.items.map((n) => n.id));
    for (const item of body2.items) {
      expect(page1Ids.has(item.id)).toBe(false);
    }
  });

  it('marks all notifications read', async () => {
    const before = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((before.body as { count: number }).count).toBeGreaterThan(0);

    const res = await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .set(authA())
      .expect(200);
    expect((res.body as { updated: number }).updated).toBeGreaterThan(0);

    const after = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(authA())
      .expect(200);
    expect((after.body as { count: number }).count).toBe(0);
  });

  // --- Deletion ---------------------------------------------------------------
  // After the block above, professional A has several *read* notifications and
  // no unread ones; professional B has none.

  const listA = async (): Promise<NotificationBody[]> => {
    const res = await request(app.getHttpServer())
      .get('/notifications?limit=50')
      .set(authA())
      .expect(200);
    return (res.body as { items: NotificationBody[] }).items;
  };

  it("does not let a professional delete another professional's notification", async () => {
    const [target] = await listA();

    const res = await request(app.getHttpServer())
      .delete(`/notifications/${target.id}`)
      .set(authB())
      .expect(200);
    expect((res.body as { deleted: number }).deleted).toBe(0);

    expect((await listA()).some((n) => n.id === target.id)).toBe(true);
  });

  it('deletes a single read notification for its owner and is idempotent', async () => {
    const before = await listA();
    const target = before[0];

    const res = await request(app.getHttpServer())
      .delete(`/notifications/${target.id}`)
      .set(authA())
      .expect(200);
    expect((res.body as { deleted: number }).deleted).toBe(1);

    const after = await listA();
    expect(after).toHaveLength(before.length - 1);
    expect(after.some((n) => n.id === target.id)).toBe(false);

    // Deleting it again is a no-op, not a 404.
    const again = await request(app.getHttpServer())
      .delete(`/notifications/${target.id}`)
      .set(authA())
      .expect(200);
    expect((again.body as { deleted: number }).deleted).toBe(0);
  });

  it('refuses to delete an UNREAD notification via the single-delete endpoint', async () => {
    await book('16:30', 'Ana Cuatro'); // fresh unread notification for A
    const unread = (await listA()).find((n) => n.readAt === null);
    expect(unread).toBeDefined();

    const res = await request(app.getHttpServer())
      .delete(`/notifications/${unread!.id}`)
      .set(authA())
      .expect(200);
    expect((res.body as { deleted: number }).deleted).toBe(0);

    expect((await listA()).some((n) => n.id === unread!.id)).toBe(true);
  });

  it('bulk-deletes only READ notifications for the authenticated professional', async () => {
    const before = await listA();
    const readIds = before.filter((n) => n.readAt !== null).map((n) => n.id);
    const unreadIds = before.filter((n) => n.readAt === null).map((n) => n.id);
    expect(readIds.length).toBeGreaterThan(0);
    expect(unreadIds).toHaveLength(1);

    const res = await request(app.getHttpServer())
      .delete('/notifications/read')
      .set(authA())
      .expect(200);
    expect((res.body as { deleted: number }).deleted).toBe(readIds.length);

    const after = await listA();
    expect(after.map((n) => n.id)).toEqual(unreadIds);
    expect(after.every((n) => n.readAt === null)).toBe(true);

    // B never had any and is untouched.
    const listB = await request(app.getHttpServer())
      .get('/notifications')
      .set(authB())
      .expect(200);
    expect((listB.body as { items: NotificationBody[] }).items).toHaveLength(0);
  });

  it('flags an at-home booking in the notification, but never carries the address in the payload', async () => {
    const address =
      'Calle 10 #43C-20, Apto 502 (Ref.: portón negro junto a la panadería)';
    const bookingId = await bookHome('13:00', 'Valentina Home', address);

    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set(authA())
      .expect(200);
    const newest = (list.body as { items: NotificationBody[] }).items[0];

    expect(newest.title).toBe('Nueva cita a domicilio');
    expect(newest.data.bookingId).toBe(bookingId);
    expect((newest.data as { atHome?: boolean }).atHome).toBe(true);

    // The address must not leak through the feed row, anywhere in it.
    expect(JSON.stringify(newest)).not.toContain('Calle 10');
    expect(JSON.stringify(newest)).not.toContain('portón negro');

    // …but it IS on the authenticated agenda response for the owner.
    const agenda = await request(app.getHttpServer())
      .get(`/bookings?from=${day.dateStr}&to=${day.dateStr}`)
      .set(authA())
      .expect(200);
    const row = (
      agenda.body as Array<{
        id: string;
        atHome: boolean;
        customerAddress: string | null;
      }>
    ).find((b) => b.id === bookingId);
    expect(row?.atHome).toBe(true);
    expect(row?.customerAddress).toBe(address);

    // A different professional cannot see it at all.
    const agendaB = await request(app.getHttpServer())
      .get(`/bookings?from=${day.dateStr}&to=${day.dateStr}`)
      .set(authB())
      .expect(200);
    expect(
      (agendaB.body as Array<{ id: string }>).some((b) => b.id === bookingId),
    ).toBe(false);
  });
});
