import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('Services (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `e2e-services-${runId}@ronda.test`;
  const otherEmail = `e2e-services-other-${runId}@ronda.test`;
  const password = 'supersecret123';

  let accessToken: string;
  let otherAccessToken: string;
  let serviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName: `E2E Servicios ${runId}` });
    accessToken = (register.body as { accessToken: string }).accessToken;

    const registerOther = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        password,
        businessName: `E2E Servicios Otro ${runId}`,
      });
    otherAccessToken = (registerOther.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    await prisma.professional.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await app.close();
  });

  it('returns an empty list for a professional with no services', async () => {
    const res = await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/services').expect(401);
  });

  it('creates a service', async () => {
    const res = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte de cabello', durationMinutes: 30 })
      .expect(201);

    const body = res.body as {
      id: string;
      name: string;
      sortOrder: number;
      isActive: boolean;
    };
    expect(body.name).toBe('Corte de cabello');
    expect(body.sortOrder).toBe(0);
    expect(body.isActive).toBe(true);

    serviceId = body.id;
  });

  it('rejects creating a service with an invalid duration', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Servicio inválido', durationMinutes: 0 })
      .expect(400);
  });

  it('appends a second service at the next sort position', async () => {
    const res = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Manicure', durationMinutes: 45 })
      .expect(201);

    expect((res.body as { sortOrder: number }).sortOrder).toBe(1);
  });

  it('lists services ordered by sortOrder', async () => {
    const res = await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { name: string }[];
    expect(body.map((s) => s.name)).toEqual(['Corte de cabello', 'Manicure']);
  });

  it('updates a service', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ durationMinutes: 40 })
      .expect(200);

    expect((res.body as { durationMinutes: number }).durationMinutes).toBe(40);
  });

  it("rejects updating another professional's service", async () => {
    await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({ durationMinutes: 50 })
      .expect(404);
  });

  it('soft-deletes a service instead of removing it', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((res.body as { isActive: boolean }).isActive).toBe(false);

    const list = await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = list.body as { id: string; isActive: boolean }[];
    expect(body.find((s) => s.id === serviceId)?.isActive).toBe(false);
  });

  it("rejects deleting another professional's service", async () => {
    await request(app.getHttpServer())
      .delete(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);
  });
});
