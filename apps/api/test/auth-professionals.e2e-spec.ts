import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('Auth + Professionals (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const email = `e2e-${runId}@agendya.test`;
  const password = 'supersecret123';
  const businessName = `E2E Belleza ${runId}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.professional.deleteMany({ where: { email } });
    await app.close();
  });

  let accessToken: string;

  it('registers a new professional and returns an access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName })
      .expect(201);

    const body = res.body as {
      accessToken: string;
      user: { email: string; slug: string };
    };
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user.email).toBe(email);
    expect(body.user.slug).toContain('e2e-belleza');

    accessToken = body.accessToken;
  });

  it('rejects registering the same email twice', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, businessName })
      .expect(409);
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in with the right credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const body = res.body as { accessToken: string };
    expect(body.accessToken).toEqual(expect.any(String));
  });

  it('rejects unauthenticated access to /auth/me', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('returns the current user on /auth/me with a valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { email: string };
    expect(body.email).toBe(email);
  });

  it('returns the full profile on GET /professionals/me', async () => {
    const res = await request(app.getHttpServer())
      .get('/professionals/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as {
      businessName: string;
      cancellationPolicyHours: number;
    };
    expect(body.businessName).toBe(businessName);
    expect(body.cancellationPolicyHours).toBe(24);
  });

  it('updates the profile via PATCH /professionals/me', async () => {
    const res = await request(app.getHttpServer())
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'Especialista en color y peinados.',
        cancellationPolicyHours: 6,
      })
      .expect(200);

    const body = res.body as {
      description: string;
      cancellationPolicyHours: number;
    };
    expect(body.description).toBe('Especialista en color y peinados.');
    expect(body.cancellationPolicyHours).toBe(6);
  });

  it('rejects a profile update with an invalid cancellation policy', async () => {
    await request(app.getHttpServer())
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ cancellationPolicyHours: 5 })
      .expect(400);
  });

  it('reports the current slug as taken by someone else as unavailable via check-slug', async () => {
    const otherEmail = `e2e-other-${runId}@agendya.test`;
    const other = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        password,
        businessName: `Otro Negocio ${runId}`,
      })
      .expect(201);
    const otherBody = other.body as { user: { slug: string } };

    const res = await request(app.getHttpServer())
      .get(`/professionals/check-slug?slug=${otherBody.user.slug}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((res.body as { available: boolean }).available).toBe(false);

    await prisma.professional.deleteMany({ where: { email: otherEmail } });
  });

  it('reports an unused slug as available via check-slug', async () => {
    const res = await request(app.getHttpServer())
      .get(`/professionals/check-slug?slug=slug-que-nadie-tiene-${runId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((res.body as { available: boolean }).available).toBe(true);
  });

  it('exposes the public profile by slug', async () => {
    const me = await request(app.getHttpServer())
      .get('/professionals/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const meBody = me.body as { slug: string };

    const res = await request(app.getHttpServer())
      .get(`/public/professionals/${meBody.slug}`)
      .expect(200);

    const body = res.body as { businessName: string; services: unknown[] };
    expect(body.businessName).toBe(businessName);
    expect(body.services).toEqual([]);
  });

  it('returns 404 for an unknown public slug', async () => {
    await request(app.getHttpServer())
      .get('/public/professionals/no-existe-esto')
      .expect(404);
  });
});
