import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { configuredOrigins, isAllowedOrigin } from './common/utils/cors.util';

// Ships in .env.example for local setup convenience. Flagged rather than
// silently trusted so a deployment that copied .env.example verbatim finds
// out from its own logs, not from someone forging tokens with a
// publicly-known secret.
const KNOWN_INSECURE_JWT_SECRETS = new Set(['dev-secret-change-in-production']);

/**
 * Security wiring shared by the real server (main.ts) and the e2e test suite,
 * so what the tests exercise is exactly what production runs — not a
 * reimplementation that could drift from it.
 */
export function configureApp(app: INestApplication): void {
  if (
    process.env.JWT_SECRET &&
    KNOWN_INSECURE_JWT_SECRETS.has(process.env.JWT_SECRET)
  ) {
    Logger.warn(
      'JWT_SECRET is set to the placeholder value from .env.example. ' +
        'Generate a strong, unique secret before deploying anywhere real tokens must stay unforgeable.',
      'Bootstrap',
    );
  }

  // Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, a
  // conservative default CSP, and removal of X-Powered-By among others).
  // This is a JSON API with no server-rendered HTML, so contentSecurityPolicy
  // stays on with its restrictive defaults; nothing in this app needs to
  // relax it.
  app.use(helmet());

  const configService = app.get(ConfigService);
  const allowedOrigins = configuredOrigins(
    configService.get<string>('webUrl'),
    configService.get<string>('publicWebUrl'),
  );

  // Restrict cross-origin requests to the configured frontends (dashboard
  // `WEB_URL` and optional public site `PUBLIC_WEB_URL`), plus any
  // localhost/private-network origin — the latter keeps `npm run dev:web:host`
  // working. No cookies are used for API auth (JWT in Authorization), so
  // `credentials` stays at its default `false`.
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header (curl, server-to-server, same-origin) — allow.
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  });
}
