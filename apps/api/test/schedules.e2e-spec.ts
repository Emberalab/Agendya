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

describe('Schedules + Availability (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `e2e-schedules-${runId}@agendya.test`;
  const otherEmail = `e2e-schedules-other-${runId}@agendya.test`;
  const password = 'supersecret123';

  let accessToken: string;
  let otherAccessToken: string;
  let slug: string;
  let serviceId: string;
  let exceptionId: string;

  const workDay = futureDate(7);
  const restDay = futureDate(8);
  const blockedDay = futureDate(9);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName: `E2E Horarios ${runId}` });
    const registerBody = register.body as {
      accessToken: string;
      user: { slug: string };
    };
    accessToken = registerBody.accessToken;
    slug = registerBody.user.slug;

    const registerOther = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        password,
        businessName: `E2E Horarios Otro ${runId}`,
      });
    otherAccessToken = (registerOther.body as { accessToken: string })
      .accessToken;

    const createService = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Corte de cabello',
        durationMinutes: 30,
        priceCents: 2000000,
      });
    serviceId = (createService.body as { id: string }).id;
  });

  afterAll(async () => {
    await prisma.professional.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await app.close();
  });

  it('returns an empty working-hours list before anything is configured', async () => {
    const res = await request(app.getHttpServer())
      .get('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('sets the working hours for the week', async () => {
    const res = await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        days: [
          { dayOfWeek: workDay.weekday, startMinute: 540, endMinute: 1080 },
        ],
      })
      .expect(200);

    const body = res.body as {
      id: string;
      dayOfWeek: string;
      startMinute: number;
      endMinute: number;
    }[];
    expect(body).toHaveLength(1);
    expect(typeof body[0].id).toBe('string');
    expect(body[0]).toMatchObject({
      dayOfWeek: workDay.weekday,
      startMinute: 540,
      endMinute: 1080,
    });
  });

  it('stores several working blocks for the same weekday', async () => {
    const res = await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        days: [
          { dayOfWeek: workDay.weekday, startMinute: 540, endMinute: 780 },
          { dayOfWeek: workDay.weekday, startMinute: 900, endMinute: 1080 },
        ],
      })
      .expect(200);

    const body = res.body as { dayOfWeek: string; startMinute: number }[];
    const forDay = body.filter((b) => b.dayOfWeek === workDay.weekday);
    expect(forDay).toHaveLength(2);
    expect(forDay.map((b) => b.startMinute)).toEqual([540, 900]);
  });

  it('rejects overlapping blocks on the same weekday', async () => {
    await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        days: [
          { dayOfWeek: 'MONDAY', startMinute: 540, endMinute: 780 },
          { dayOfWeek: 'MONDAY', startMinute: 700, endMinute: 1000 },
        ],
      })
      .expect(400);
  });

  it('rejects working hours where the closing time is before the opening time', async () => {
    await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        days: [{ dayOfWeek: 'MONDAY', startMinute: 600, endMinute: 500 }],
      })
      .expect(400);
  });

  it('replaces the whole week on a subsequent PUT rather than merging', async () => {
    await request(app.getHttpServer())
      .put('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        days: [
          { dayOfWeek: workDay.weekday, startMinute: 480, endMinute: 720 },
        ],
      })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/schedules/working-hours')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { dayOfWeek: string }[];
    expect(body).toHaveLength(1);
    expect(body[0].dayOfWeek).toBe(workDay.weekday);
  });

  it('creates a schedule exception', async () => {
    const res = await request(app.getHttpServer())
      .post('/schedules/exceptions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ date: blockedDay.dateStr, reason: 'Vacaciones' })
      .expect(201);

    const body = res.body as { id: string; date: string; reason: string };
    expect(body.date).toBe(blockedDay.dateStr);
    expect(body.reason).toBe('Vacaciones');
    exceptionId = body.id;
  });

  it('rejects a duplicate exception for the same date', async () => {
    await request(app.getHttpServer())
      .post('/schedules/exceptions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ date: blockedDay.dateStr })
      .expect(409);
  });

  it('lists exceptions', async () => {
    const res = await request(app.getHttpServer())
      .get('/schedules/exceptions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { date: string }[];
    expect(body.map((e) => e.date)).toContain(blockedDay.dateStr);
  });

  it("rejects deleting another professional's exception", async () => {
    await request(app.getHttpServer())
      .delete(`/schedules/exceptions/${exceptionId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);
  });

  describe('public availability', () => {
    it('returns 404 for an unknown slug', async () => {
      await request(app.getHttpServer())
        .get('/public/professionals/no-existe/availability')
        .query({
          serviceIds: '00000000-0000-0000-0000-000000000000',
          date: '2026-01-01',
        })
        .expect(404);
    });

    it('rejects a malformed query', async () => {
      await request(app.getHttpServer())
        .get(
          `/public/professionals/${slug}/availability?serviceIds=svc-1&date=not-a-date`,
        )
        .expect(400);
    });

    it('returns slots on a configured working day', async () => {
      const res = await request(app.getHttpServer())
        .get(`/public/professionals/${slug}/availability`)
        .query({ serviceIds: serviceId, date: workDay.dateStr })
        .expect(200);

      const body = res.body as { slots: string[] };
      expect(body.slots.length).toBeGreaterThan(0);
      expect(body.slots[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    });

    it('returns no slots on a day without configured working hours', async () => {
      const res = await request(app.getHttpServer())
        .get(`/public/professionals/${slug}/availability`)
        .query({ serviceIds: serviceId, date: restDay.dateStr })
        .expect(200);

      expect((res.body as { slots: string[] }).slots).toEqual([]);
    });

    it('returns no slots on a date blocked by a schedule exception', async () => {
      // blockedDay may not fall on a working weekday; force one by also opening that weekday,
      // then confirm the exception still wins.
      await request(app.getHttpServer())
        .put('/schedules/working-hours')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          days: [
            { dayOfWeek: blockedDay.weekday, startMinute: 480, endMinute: 720 },
          ],
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/public/professionals/${slug}/availability`)
        .query({ serviceIds: serviceId, date: blockedDay.dateStr })
        .expect(200);

      expect((res.body as { slots: string[] }).slots).toEqual([]);
    });
  });

  it('deletes an owned exception', async () => {
    await request(app.getHttpServer())
      .delete(`/schedules/exceptions/${exceptionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/schedules/exceptions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = res.body as { id: string }[];
    expect(body.find((e) => e.id === exceptionId)).toBeUndefined();
  });
});
