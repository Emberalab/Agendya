// The reminders cron otherwise fires on its own 15-minute schedule and can race
// serializable booking transactions in the e2e suite (both touch the same rows).
process.env.DISABLE_SCHEDULED_JOBS = 'true';

// The auth strategy reads JWT config during module initialization, so tests need
// a deterministic secret even when the CI environment does not provide one.
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

// The e2e suite must not hit the real Resend API (a local .env may carry a live
// key, and test bookings use @example.com addresses Resend rejects with a 422).
// Set to empty rather than delete: ConfigModule/dotenv only fills vars that are
// absent from process.env, so an empty string keeps it from reloading the .env
// value. With no key MailService no-ops and just logs "[dev] Email a ...".
process.env.RESEND_API_KEY = '';
