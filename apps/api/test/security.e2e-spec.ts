import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/bootstrap';

describe('Security headers, CORS, and OAuth CSRF protection (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same wiring main.ts applies in production — see bootstrap.ts.
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Regression test: the API used to send no security headers at all and
  // exposed `X-Powered-By: Express`.
  it('sends helmet security headers and hides X-Powered-By', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/professionals/no-existe')
      .expect(404);

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  // Regression test: `app.enableCors()` with no options reflected any Origin
  // (effectively `Access-Control-Allow-Origin: *`).
  it('does not reflect an arbitrary cross-origin Origin header', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/professionals/no-existe')
      .set('Origin', 'https://evil-attacker.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reflects the configured frontend origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/professionals/no-existe')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
  });

  // Regression test: `npm run dev:web:host` opens the frontend from a LAN
  // IP, which CORS must keep allowing after locking origin down.
  it('reflects a private-network (LAN) origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/professionals/no-existe')
      .set('Origin', 'http://192.168.1.50:5173');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://192.168.1.50:5173',
    );
  });

  // Regression test for the OAuth login-CSRF finding: the callback used to
  // trust `req.user` from any completed Google handshake with no proof it
  // was the same browser that started this flow.
  it('rejects a Google OAuth callback with no state cookie', async () => {
    await request(app.getHttpServer())
      .get('/auth/google/callback?code=fake&state=whatever')
      .expect(403);
  });

  it('rejects a Google OAuth callback whose state does not match the cookie', async () => {
    await request(app.getHttpServer())
      .get('/auth/google/callback?code=fake&state=wrong-value')
      .set('Cookie', 'oauth_state=the-real-value')
      .expect(403);
  });
});
