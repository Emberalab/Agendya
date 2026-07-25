// The reminders cron otherwise fires on its own 15-minute schedule and can race
// serializable booking transactions in the e2e suite (both touch the same rows).
process.env.DISABLE_SCHEDULED_JOBS = 'true';

// The auth strategy reads JWT config during module initialization, so tests need
// a deterministic secret even when the CI environment does not provide one.
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
