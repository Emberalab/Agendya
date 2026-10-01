// The auth strategy reads JWT config during module initialization, so tests
// need a deterministic secret even when the CI environment does not provide
// one.
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-backoffice-jwt-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
