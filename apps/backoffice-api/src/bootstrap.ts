import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { configuredOrigins, isAllowedOrigin } from './common/utils/cors.util';

// Ships in .env.example for local setup convenience. Flagged rather than
// silently trusted so a deployment that copied .env.example verbatim finds
// out from its own logs, not from someone forging tokens with a
// publicly-known secret.
const KNOWN_INSECURE_JWT_SECRETS = new Set([
  'dev-secret-change-in-production',
  'dev-backoffice-secret-change-in-production',
]);

/**
 * Security wiring shared by the real server (main.ts) and the e2e test
 * suite — same shape as apps/api/src/bootstrap.ts, kept as a separate copy
 * (not a shared package) because these are now two independently deployed
 * services with their own CORS allowlist (apps.api's WEB_URL vs. this app's
 * BACKOFFICE_WEB_URL).
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

  app.use(helmet());

  const configService = app.get(ConfigService);
  const allowedOrigins = configuredOrigins(
    configService.get<string>('backofficeWebUrl'),
  );

  // Restrict cross-origin requests to the Backoffice frontend's own origin,
  // plus any localhost/private-network origin (LAN dev). No cookies are used
  // for auth (JWT in Authorization), so `credentials` stays at its default
  // `false`.
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  });
}
