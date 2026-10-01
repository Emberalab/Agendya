export default () => ({
  port: parseInt(process.env.PORT ?? '4001', 10),
  jwt: {
    // Deliberately its own secret, separate from apps/api's JWT_SECRET (see
    // .env.example) — these are now genuinely separate services, so a leaked
    // secret on one side shouldn't compromise the other. The `audience`
    // claim (BACKOFFICE_JWT_AUDIENCE) is what actually keeps a customer
    // token and a staff token from authenticating each other's routes; a
    // distinct secret is defense in depth on top of that.
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  // Origin of the Backoffice frontend (apps/backoffice-web), for CORS —
  // distinct from apps/api's WEB_URL (the professional-facing dashboard).
  backofficeWebUrl: (
    process.env.BACKOFFICE_WEB_URL ?? 'http://localhost:5174'
  ).replace(/\/+$/, ''),
  // Google sign-in for staff. Optional: when the client id/secret are unset
  // the "Continuar con Google" button redirects back with
  // `?error=google_unavailable` instead of failing. Use a Google OAuth client
  // of its own (not apps/api's) so the two consent screens and redirect URIs
  // stay independent.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || undefined,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:4001/backoffice/auth/google/callback',
    // Comma-separated, e.g. "agendya.co". Empty = any verified Google email
    // that matches an existing active staff account.
    allowedDomains: (process.env.GOOGLE_ALLOWED_DOMAINS ?? '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  },
  // Transactional email (password recovery). Without RESEND_API_KEY emails
  // are only logged — fine for local dev, never for production.
  resendApiKey: process.env.RESEND_API_KEY || undefined,
  mail: {
    from: process.env.MAIL_FROM ?? 'Agendya Backoffice <no-reply@agendya.co>',
    replyTo: process.env.MAIL_REPLY_TO ?? 'info@agendya.co',
  },
});
