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
});
